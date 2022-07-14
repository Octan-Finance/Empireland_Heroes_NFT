// SPDX-License-Identifier: None
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "./interfaces/IEPLManagement.sol";

contract EPLBox is ERC721Enumerable {
	IEPLManagement public gov;

	bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
	bytes32 public constant ADMIN_ROLE = 0x00;

	string public baseURI;

	modifier isHalted() {
		require(!gov.halted(), "Under Maintenance");
		_;
	}
	
	modifier onlyMinter() {
        require(
			gov.hasRole(MINTER_ROLE, _msgSender()), "Caller is not Minter"
		);
        _;
    }

	modifier onlyManager() {
        require(
            gov.hasRole(MANAGER_ROLE, _msgSender()), "Caller is not Manager"
        );
        _;
    }

	modifier onlyAdmin() {
        require(
            gov.hasRole(ADMIN_ROLE, _msgSender()), "Caller is not Admin"
        );
        _;
    }

	event Minted(address indexed to, uint256 indexed fromID, uint256 indexed toID);

	constructor(IEPLManagement _gov, string memory _uri) ERC721("Empireland Box", "EPLB") {
		gov = _gov;
		baseURI = _uri;
	}

	/**
       	@notice Update Address of EPLManagement contract
       	@dev  Caller must have ADMIN_ROLE
		@param	_gov				Address of EPLManagement contract
    */
	function setGov(IEPLManagement _gov) external onlyAdmin {
		require(address(_gov) != address(0), "Set Zero Address");
		gov = _gov;
	}

	/**
       	@notice Update new value of Base URI
       	@dev  Caller must have MANAGER_ROLE
       	@param _newURI		New string of `baseURI`
    */
	function updateBaseURI(string memory _newURI) external onlyManager {
		require(bytes(_newURI).length != 0, "Empty URI");
		baseURI = _newURI;
	}

	/**
       	@notice Mint Box to `_to`
       	@dev  Caller must have MINTER_ROLE
		@param	_to				Address of Beneficiary
		@param	_fromID			Start of TokenID
		@param	_amount			Amount of Boxes to be minted
    */
	function mint(address _to, uint256 _fromID, uint256 _amount) external onlyMinter {
		for (uint256 i = _fromID; i < _fromID + _amount; i++) 
			_safeMint(_to, i);

		emit Minted(_to, _fromID, _fromID + _amount - 1);
	}

	/**
       	@notice Query a list of Boxes that owned by `_owner`
       	@dev  Caller can be ANY
		@param	_owner			Account's address to query
		@param	_fromIdx		Starting index
		@param	_toIdx			Ending index
    */
	function tokensByOwner(address _owner, uint256 _fromIdx, uint256 _toIdx) external view returns (uint256[] memory _tokens) {
		uint256 _size = _toIdx - _fromIdx + 1;
		_tokens = new uint256[](_size);

		for(uint256 i; i < _size; i++) 
			_tokens[i] = tokenOfOwnerByIndex(_owner, _fromIdx + i);
	}

	function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal virtual override isHalted {
		super._beforeTokenTransfer(from, to, tokenId);
    }

	function _baseURI() internal view virtual override returns (string memory) {
		return baseURI;
	}
}
