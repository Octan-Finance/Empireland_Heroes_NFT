// SPDX-License-Identifier: None
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./interfaces/INFTToken.sol";
import "./interfaces/IEPLManagement.sol";

contract SaleEvents {
    using SafeERC20 for IERC20;

    struct EventInfo {
        uint256 start;
        uint256 end;
        address nftToken;
        address paymentToken;
        uint256 price;
        uint256 maxSaleAmt;
        uint256 availableAmt;
        uint256 maxAllocation;
    }

	IEPLManagement public gov;

	bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

	mapping(uint256 => EventInfo) public events;
	mapping(uint256 => mapping(address => uint256)) public purchased;
    mapping(uint256 => mapping(address => bool)) public whitelist;
    mapping(address => uint256) public counters;

	modifier onlyManager() {
        require(
            gov.hasRole(MANAGER_ROLE, msg.sender), "Caller is not Manager"
        );
        _;
    }

    event Purchased(
        address indexed buyer,
        uint256 indexed eventId,
        uint256 fromId,
        uint256 toId,
        uint256 paymentAmt
    );

	constructor(IEPLManagement _gov) {
		gov = _gov;
	}

	/**
       	@notice Update Address of EPLManagement contract
       	@dev  Caller must have MANAGER_ROLE
		@param	_gov				Address of EPLManagement contract (or address(0))
    */
	function setGov(address _gov) external onlyManager {
		gov = IEPLManagement(_gov);
	}

	/**
       	@notice Set configurations for one Sale Event
       	@dev  Caller must have MANAGER_ROLE
		@param	_eventID			        ID of Special Event
		@param 	_start				        Event starting time
        @param 	_end				        Event ending time
        @param 	_nftToken				    Address of NFT contract involved in the Sale Event
        @param 	_paymentToken				Payment acceptance for the Sale Event
        @param 	_price				        Unit price
        @param 	_maxSaleAmt				    Max items can be purchased in the Sale Event
        @param 	_maxAllocation				Max items can be purchased by one Account in the Sale Event
    */
	function setEvent(
        uint256 _eventID,
        uint256 _start,
        uint256 _end,
        address _nftToken,
        address _paymentToken,
        uint256 _price,
        uint256 _maxSaleAmt,
        uint256 _maxAllocation
    ) external onlyManager {
        uint256 _current = block.timestamp;
		require(events[_eventID].end == 0, "Event exists");
        require(
            _current <= _start && _start < _end && _nftToken != address(0) && _price != 0,
            "Invalid settings"
        );
        require(gov.paymentTokens(_paymentToken), "Payment not accepted");

        events[_eventID].start = _start;
        events[_eventID].end = _end;
        events[_eventID].nftToken = _nftToken;
        events[_eventID].paymentToken = _paymentToken;
        events[_eventID].price = _price;
        events[_eventID].maxSaleAmt = _maxSaleAmt;
        events[_eventID].availableAmt = _maxSaleAmt;
        events[_eventID].maxAllocation = _maxAllocation;
	}

    /**
        @notice Add/Remove `_beneficiaries`
        @dev  Caller must have MANAGER_ROLE
        @param _eventId                     Number ID of an event
        @param _beneficiaries               A list of `_beneficiaries`
        @param _opt                         Operational Option (Add = true, Remove = false)
    */
    function setWhitelist(uint256 _eventId, address[] calldata _beneficiaries, bool _opt) external onlyManager {
        uint256 _current = block.timestamp;
        require(_current <= events[_eventId].end, "Event already ended");

        uint256 _len = _beneficiaries.length;
        for(uint256 i; i < _len; i++) {
            if (_opt)
                whitelist[_eventId][_beneficiaries[i]] = true;
            else 
                delete whitelist[_eventId][_beneficiaries[i]];
        }
    }

    /**
        @notice Purchase items of one Sale Event
        @dev  Caller can be ANY
        @param _eventId              Number ID of an event
        @param _amount               A list of `_beneficiaries`

        Note: when `halted = true`, ERC-721 contracts (Box/Heroes) will be halted in transferring tokens
            Thus, it doesn't need to add a checking point here
    */
    function purchase(uint256 _eventId, uint256 _amount) external payable {
        //  Check if the purchase request is valid
        //  - Must be in the whitelist for the event
        //  - Must be in the event's schedule
        address _beneficiary = msg.sender;
        uint256 _current = block.timestamp;
        require(
            events[_eventId].start <= _current && 
            _current <= events[_eventId].end &&
            whitelist[_eventId][_beneficiary],
            "Invalid request"
        );

        events[_eventId].availableAmt -= _amount;       //  if `availableAmt` < `_amount` -> underflow -> revert

        //  Check `msg.value` if `paymentToken = 0x00` (Native Coin)
        //  and purchased amount must not exceed `maxAllocation`
        address _paymentToken = events[_eventId].paymentToken;
        uint256 _purchaseAmt = purchased[_eventId][_beneficiary] + _amount;
        uint256 _paymentAmt = events[_eventId].price * _amount;
        require(_purchaseAmt <= events[_eventId].maxAllocation, "Exceed max allocation");
        if (_paymentToken == address(0))
            require(_paymentAmt == msg.value, "Invalid payment amount");

        purchased[_eventId][_beneficiary] = _purchaseAmt;
        _makePayment(_paymentToken, _beneficiary, _paymentAmt);

        address _nftToken = events[_eventId].nftToken;
        uint256 _counter = counters[_nftToken];
        INFTToken(_nftToken).mint(_beneficiary, _counter, _amount);
        counters[_nftToken] = _counter + _amount;

        emit Purchased(_beneficiary, _eventId, _counter, _counter + _amount - 1, _paymentAmt);
    }

    function _makePayment(address _token, address _from, uint256 _amount) private {
        address _treasury = gov.treasury();
        if (_token == address(0))
            Address.sendValue(payable(_treasury), _amount);
        else
            IERC20(_token).safeTransferFrom(_from, _treasury, _amount);
    }
}
