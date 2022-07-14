// SPDX-License-Identifier: None
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./interfaces/IEPLManagement.sol";

contract Claim {
	IEPLManagement public gov;

	bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

	mapping(uint256 => bytes32) public roots;
	mapping(uint256 => mapping(address => bool)) public claimed;

	event Drop(
		address indexed token,
		address indexed receiver,
		uint256 indexed eventID,
		uint256 tokenID
	);

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
		Note: When `_gov = address(0)`, Redemption contract is deprecated
    */
	function setGov(address _gov) external onlyManager {
		gov = IEPLManagement(_gov);
	}

	/**
       	@notice Set Root Hash of the Special Event
       	@dev  Caller must have MANAGER_ROLE
		@param	_eventID			ID of Special Event
		@param 	_root				Root Hash
    */
	function setRoot(uint256 _eventID, bytes32 _root) external onlyManager {
		require(roots[_eventID] == "", "EventID recorded");
		require(_root != "", "Empty Hash");
		roots[_eventID] = _root;
	}

	/**
       	@notice Claim Air Drop/Special Event
       	@dev  Caller can be ANY
		@param	_eventID				ID of Special Event
		@param	_tokenID				TokenID of item about to transfer to `msg.sender`
		@param	_distributor			Wallet's address that holds NFTs/Heroes
		@param	_token					Address of NFT/Token contract
		@param	_proof					An array of proof

		Note: when `halted = true`, ERC-721 contracts (Box/Heroes) will be halted in transferring tokens
            Thus, it doesn't need to add a checking point here
    */
	function claim(
		uint256 _eventID,
		uint256 _tokenID,
		address _distributor,
		address _token,
		bytes32[] calldata _proof
	) external {
		require(address(gov) != address(0), "Out of Service");
		
		address _user = msg.sender;
		bytes32 _root = roots[_eventID];
		require(_root != "", "EventID not recorded");
		require(!claimed[_eventID][_user], "Already claimed");

		claimed[_eventID][_user] = true;
		bytes32 _leaf = keccak256(
			abi.encodePacked(_user, _tokenID, _eventID, _token, _distributor)
		);
		require(
			MerkleProof.verify(_proof, _root, _leaf), "Invalid claim"
		);

		IERC721(_token).safeTransferFrom(_distributor, _user, _tokenID);

		emit Drop(_token, _user, _eventID, _tokenID);
	}
}
