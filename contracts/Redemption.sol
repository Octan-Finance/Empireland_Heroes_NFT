// SPDX-License-Identifier: None
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./interfaces/IEPLManagement.sol";

contract Redemption {
	IEPLManagement public gov;

	address public constant BLACK_HOLE = 0x000000000000000000000000000000000000dEaD;
	bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

	event Redeem(
		address indexed fromContr,
		address indexed toContr,
		address nftHolder,
		address indexed receiver,
		uint256[] burnedIDs,
		uint256[] issuedIDs
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
       	@notice Redeem Ticket/Box (ERC-721) and Transfer minted NFTs to `_receiver`
       	@dev  Caller must have MANAGER_ROLE
		@param	_fromContr				Address of Ticket/Box (ERC-721) contract
		@param	_toContr				Address of NFT contract
		@param	_distributor			Wallet's address that holds NFTs/Heroes
		@param	_receiver				Address of Receiver
		@param	_burnIDs				IDs of Ticket/Box that need to be burned
		@param 	_issueIDs				IDs of NFTs/Heroes that need to be transferred to `_receiver`

		Note: when `halted = true`, ERC-721 contracts (Box/Heroes) will be halted in transferring tokens
            Thus, it doesn't need to add a checking point here
    */
	function redeem(
		address _fromContr,
		address _toContr,
		address _distributor,
		address _receiver,
		uint256[] calldata _burnIDs,
		uint256[] calldata _issueIDs
	) external onlyManager {
		uint256 _size = _burnIDs.length;
		require(_size == _issueIDs.length, "Size mismatch");

		IERC721 _from = IERC721(_fromContr);
		IERC721 _to = IERC721(_toContr);
		uint256 _burnId;
		for(uint256 i; i < _size; i++) {
			_burnId = _burnIDs[i];
			require(
				_from.ownerOf(_burnId) == _receiver, "Box/Ticket not owned"
			);
			_from.safeTransferFrom(_receiver, BLACK_HOLE, _burnId);
			_to.safeTransferFrom(_distributor, _receiver, _issueIDs[i]);
		}

		emit Redeem(_fromContr, _toContr, _distributor, _receiver, _burnIDs, _issueIDs);
	}
}
