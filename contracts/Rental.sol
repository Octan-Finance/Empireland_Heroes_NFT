//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./interfaces/IEPLManagement.sol";

contract Rental {
    IEPLManagement public gov;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    
    mapping(uint256 => uint256) public onLeasing;
    bool public paused;

    event OnLeasing(address indexed token, address indexed owner, uint256 indexed tokenID, uint256 endTime);

    modifier inService() {
        require(address(gov) != address(0), "Out of Service");
        _;
    }

    modifier onPaused() {
        require(!paused, "On Paused");
        _;
    }

    modifier onlyManager() {
        require(
            gov.hasRole(MANAGER_ROLE, msg.sender), "Caller is not Manager"
        );
        _;
    }

    constructor(address _gov) {
        gov = IEPLManagement(_gov);
    }

    /**
       	@notice Update Address of EPLManagement contract
       	@dev  Caller must have ADMIN_ROLE
		@param	_gov				Address of EPLManagement contract (or address(0))
		Note: When `_gov = address(0)`, Rental contract is deprecated
    */
	function setGov(address _gov) external onlyManager {
		gov = IEPLManagement(_gov);
	}

    /**
       	@notice Pause setting for lease
       	@dev  Caller must have MANAGER_ROLE
    */
	function pause() external onlyManager {
		paused = true;
	}

    /**
       	@notice Unpause setting for lease
       	@dev  Caller must have MANAGER_ROLE
    */
	function unpause() external onlyManager {
		paused = false;
	}

    function setForLease(
        address _token,
        uint256 _tokenId,
        uint256 _endTime
    ) external onPaused {
        require(gov.listOfNFTs(_token), "Token not supported");
        require(
            IERC721(_token).ownerOf(_tokenId) == msg.sender,
            "TokenId not owned"
        );
        require(onLeasing[_tokenId] < block.timestamp, "On leasing");
        onLeasing[_tokenId] = _endTime;

        emit OnLeasing(_token, msg.sender, _tokenId, _endTime);
    }
}
