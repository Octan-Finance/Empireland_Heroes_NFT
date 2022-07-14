// SPDX-License-Identifier: None
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "./interfaces/IEPLManagement.sol";
import "./interfaces/IRental.sol";

contract EPLHeroes is ERC721Enumerable {
	IEPLManagement public gov;
	IRental public rental;

	bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
	bytes32 public constant ADMIN_ROLE = 0x00;

	uint256 public constant MAX_SUPPLY = 5000;
	uint256 public minted;		//	Number of Heroes have been minted
	uint256 public burned;		//	Number of Heroes have been burned

	string public baseURI;
	mapping(uint256 => mapping(address => uint256)) public nonces;
	bool public disabled;			//	disable breed()

	modifier isHalted() {
		require(!gov.halted(), "Under Maintenance");
		_;
	}

	modifier isDisabled() {
		require(!disabled, "Disabled");
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

	event GiveBirth(address indexed to, uint256 indexed fromID, uint256 indexed toID);
	event ToTheAsh(address indexed from, uint256[] IDs);

	constructor(address _gov, string memory _uri) ERC721("Empireland Limited Heroes", "EPLH") {
		gov = IEPLManagement(_gov);
		baseURI = _uri;
	}

	/**
       	@notice Update Address of EPLManagement contract
       	@dev  Caller must have ADMIN_ROLE
		@param	_gov				Address of EPLManagement contract
    */
	function setGov(address _gov) external onlyAdmin {
		require(_gov != address(0), "Set Zero Address");
		gov = IEPLManagement(_gov);
	}

	/**
       	@notice Disable breed() function
       	@dev  Caller must have ADMIN_ROLE
       	Note: Once set - `locked = true`, disable breed() function PERMANENTLY
	   	Please make sure when this function should be called
    */
	function disable() external onlyAdmin {
		disabled = true;
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
        @notice Set Rental contract
        @dev  Caller must have MANAGER_ROLE
        @param _rental        Address of Rental contract
        Note: To disable, MANAGER_ROLE sets address(0)
    */
    function setRental(address _rental) external onlyManager {
        rental = IRental(_rental);
    }

	/**
       	@notice Mint Heroes NFT to `_to`
       	@dev  Caller must have MINTER_ROLE
		@param	_to				Receiver of minting Heroes
		@param	_fromID			Start of TokenID
		@param	_amount			Amount of Heroes to be minted
       	Note: When`locked = true`, breed() is permanently disable
    */
	function breed(address _to, uint256 _fromID, uint256 _amount) external onlyMinter isDisabled {
		uint256 _minted = minted; 		// gas saving
		require(_minted + _amount <= MAX_SUPPLY, "Exceed MAX_SUPPLY");

		for (uint256 i = _fromID; i < _fromID + _amount; i++) {
			_safeMint(_to, i);
		}

		//	`minted` is increased when new Heroes are minted
		//	It does not decrease even when Heroes are burned
		minted = _minted + _amount;

		emit GiveBirth(_to, _fromID, _fromID + _amount - 1);
	}

	/**
       	@notice Burn Heroes NFT from `msg.sender`
       	@dev  Caller can be ANY
		@param	_ids				A list of `tokenIds` to be burned
       	Note: Allow burning NFT that `msg.sender` currently owns
			Special roles (admin, manager, or minter) are not allowed to burn the NFTs of other Owners
    */
	function cremation(uint256[] calldata _ids) external {
		uint256 _amounts = _ids.length;
		require(_amounts != 0, "Burning amount is zero");

		address _requestor = _msgSender();
		uint256 _tokenId;
		for (uint256 i; i < _amounts; i++) {
			_tokenId = _ids[i];
			require(
				ownerOf(_tokenId) == _requestor, "Hero not owned"
			);
			_burn(_tokenId);
		}
		
		burned = burned + _amounts;

		emit ToTheAsh(_requestor, _ids);
	}

	/**
       	@notice Query a list of Heroes that owned by `_owner`
       	@dev  Caller can be ANY
		@param	_owner			Account's address to query
		@param	_fromIdx		Starting index
		@param	_toIdx			Ending index
       	Example: User A owns 100 Heroes - balanceOf(`User A`) = 100 -> index = [0:99] 
		   - Query [0:99]: tokensByOwner(`User A`, 0, 99)
		   - Query [20:50]: tokensByOwner(`User A`, 20, 50)
    */
	function tokensByOwner(address _owner, uint256 _fromIdx, uint256 _toIdx) external view returns (uint256[] memory _tokens) {
		uint256 _size = _toIdx - _fromIdx + 1;
		_tokens = new uint256[](_size);

		for(uint256 i; i < _size; i++) 
			_tokens[i] = tokenOfOwnerByIndex(_owner, _fromIdx + i);
	}

	function _baseURI() internal view virtual override returns (string memory) {
		return baseURI;
	}

	function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal virtual override isHalted {
        if (address(rental) != address(0)) {
            require(
                rental.onLeasing(tokenId) < block.timestamp,
                "On leasing"
            );
        }

		super._beforeTokenTransfer(from, to, tokenId);
    }

	function _afterTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override {
		nonces[tokenId][from] += 1;
		nonces[tokenId][to] += 1;
	}
}
