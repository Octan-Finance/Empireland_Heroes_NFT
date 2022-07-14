//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "./interfaces/IEPLManagement.sol";

contract LockPool is ERC721Holder {
    struct LockingInfo {
        uint256 lockTime;
        uint256 index;
        string username;                //  Username on Discord
        uint256[] tokenIDs;             //  A list of `tokenID` is currently locked
    }

    IEPLManagement public gov;
    IERC721 public token;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    uint256 public start;  
    uint256 public end;    

    mapping(address => LockingInfo) private locked;
    address[] public users;

    event Locked(address indexed user);
    event Released(address indexed user, uint256[] tokenIDs);

    modifier inService() {
        require(address(gov) != address(0), "Out of Service");
        _;
    }

    modifier lockable() {
        require(block.timestamp >= start, "Pool not started yet");
        _;
    }

    modifier claimable() {
         require(block.timestamp >= end, "Not yet ready");
        _;
    }

    modifier onlyManager() {
        require(
            gov.hasRole(MANAGER_ROLE, msg.sender), "Caller is not Manager"
        );
        _;
    }

    constructor(address _gov, address _token, uint256 _start, uint256 _end) {
        require(_gov != address(0), "Set zero address");

        gov = IEPLManagement(_gov);
        token = IERC721(_token);
        start = _start;
        end = _end;
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
       	@notice Update Lock Pool information
       	@dev  Caller must have MANAGER_ROLE
		@param	_token				Address of NFT contract
        @param	_start				Starting time that allows Users to lock their tokens
        @param	_end				Ending time that allows Users to claim back their tokens
    */
	function setLockPool(address _token, uint256 _start, uint256 _end) external onlyManager {
        require(_token != address(0), "Set zero address");
        require( 
            block.timestamp <= _start && _start < _end, "Invalid schedule"
        );

		token = IERC721(_token);
        start = _start;
        end = _end;
	}

    /**
       	@notice Request locking tokens
       	@dev  Caller can be ANY
		@param	_username			Username log-in on Discord
        @param	_tokenIDs		    A list of `tokenID` that requests to be locked
        Note: 
            - Once locking, User is unable to alter information. 
            - Tokens are claimable after `end`
    */
    function lock(string calldata _username, uint256[] calldata _tokenIDs) external inService lockable {
        address _owner = msg.sender;
        require(
            locked[_owner].lockTime == 0, "Address already in use"
        );

        uint256 _size = _tokenIDs.length;
        require(
            _size > 0 && _size <= 10, "Invalid locking amount"
        );

        uint256 _id;
        for (uint256 i; i < _size; i++) {
            _id = _tokenIDs[i];
            require(
                token.ownerOf(_id) == _owner, "TokenID not owned"
            );

            token.safeTransferFrom(_owner, address(this), _id);
        }
        locked[_owner] = LockingInfo({
            lockTime: block.timestamp,
            index: users.length,
            username: _username,
            tokenIDs: _tokenIDs
        });
        users.push(_owner);

        emit Locked(_owner);
    }

    /**
       	@notice Request unlocking tokens
       	@dev  Caller can be ANY
        Note: 
            - Users claim back their tokens that have been locked before 
            - Tokens are claimable after `end`
    */
    function claim() external claimable {
        address _owner = msg.sender;
        uint256[] memory _ids = locked[_owner].tokenIDs;
        uint256 _size = _ids.length;
        require(_size != 0, "Not recorded or claimed already");

        for(uint256 i; i < _size; i++)
            token.safeTransferFrom(address(this), _owner, _ids[i]);

        _removeLockingInfo(_owner);

        emit Released(_owner, _ids);
    }

    function _removeLockingInfo(address _owner) private {
        uint256 _currentIdx = locked[_owner].index;
        address _lastUser = users[users.length - 1];

        locked[_lastUser].index = _currentIdx;
        users[_currentIdx] = _lastUser;
        delete locked[_owner];
        users.pop();
    }

    /**
       	@notice Release locking tokens
       	@dev  Caller must have MANAGER_ROLE
        Note: 
            - This method should ONLY be used in the case that a new locking event has been set
            but some `tokenIDs`, from previous locking event, have not yet been claimed by Users
    */
    function release(address _token, address _user) external onlyManager {
        uint256[] memory _ids = locked[_user].tokenIDs;
        uint256 _size = _ids.length;
        require(_size != 0, "Not recorded or claimed already");

        for(uint256 i; i < _size; i++)
            IERC721(_token).safeTransferFrom(address(this), _user, _ids[i]);
        
        _removeLockingInfo(_user);

        emit Released(_user, _ids);
    }

    /**
       	@notice Query locking info of one `_account`
       	@dev  Caller can be ANY
		@param	_account            Address of account that needs to get the info
    */
    function getLockingInfo(address _account) external view returns (LockingInfo memory) {
        return locked[_account];
    }

    /**
       	@notice Query total number of locking users
       	@dev  Caller can be ANY
    */
    function totalLocking() external view returns (uint256) {
        return users.length;
    }
}
