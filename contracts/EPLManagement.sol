// SPDX-License-Identifier: None
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

/**
    @title EPLManagement contract
    @dev This contract is being used as Governance of Empireland
       + Register address (Treasury) to receive Commission Fee 
       + Set up additional special roles - DEFAULT_ADMIN_ROLE, MANAGER_ROLE and MINTER_ROLE
*/
contract EPLManagement is AccessControlEnumerable {
    address public treasury;

    mapping(address => bool) public listOfNFTs;
    mapping(address => bool) public paymentTokens;

    bool public halted;

    //  Declare Roles - MANAGER_ROLE and MINTER_ROLE
    //  There are three roles:
    //     - Top Gun = DEFAULT_ADMIN_ROLE:
    //         + Manages governance settings
    //         + Has an authority to grant/revoke other roles
    //         + Has an authority to set him/herself other roles
    //     - MANAGER_ROLE
    //         + Has an authority to do special tasks, i.e. settings
    //         + NFT Holder when Heroes/item are minted
    //     - MINTER_ROLE
    //         + Has an authority to mint NFT items
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(address _treasury) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        treasury = _treasury;
    }

    /**
       @notice Register NFT Contract
       @dev  Caller must have MANAGER_ROLE
       @param _nftContr         Address of NFT Contract
    */
    function addToList(address _nftContr) external onlyRole(MANAGER_ROLE) {
        require(_nftContr != address(0), "Set zero address");
        require(!listOfNFTs[_nftContr], "Already added");

        listOfNFTs[_nftContr] = true;
    }

    /**
       @notice Unregister NFT Contract
       @dev  Caller must have MANAGER_ROLE
       @param _nftContr         Address of NFT Contract
    */
    function removeFromList(address _nftContr) external onlyRole(MANAGER_ROLE) {
        require(listOfNFTs[_nftContr], "Not found");

        listOfNFTs[_nftContr] = false;
    }

    /**
       @notice Register Payment Token
       @dev  Caller must have MANAGER_ROLE
       @param _token         Address of Payment Token (0x00 - Native Coin)
    */
    function addPayment(address _token) external onlyRole(MANAGER_ROLE) {
        require(!paymentTokens[_token], "Payment is accepted");

        paymentTokens[_token] = true;
    }

    /**
       @notice Unregister Payment Token
       @dev  Caller must have MANAGER_ROLE
       @param _token         Address of Payment Token (0x00 - Native Coin)
    */
    function removePayment(address _token) external onlyRole(MANAGER_ROLE) {
        require(paymentTokens[_token], "Not found");

        delete paymentTokens[_token];
    }

    /**
       @notice Set `halted = true`
       @dev  Caller must have MANAGER_ROLE
    */
    function halt() external onlyRole(MANAGER_ROLE) {
        halted = true;
    }

    /**
       @notice Set `halted = false`
       @dev  Caller must have MANAGER_ROLE
    */
    function unhalt() external onlyRole(MANAGER_ROLE) {
        halted = false;
    }

    /**
       @notice Change new address of Treasury
       @dev  Caller must have DEFAULT_ADMIN_ROLE
       @param _newTreasury    Address of new Treasury
    */
    function updateTreasury(address _newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_newTreasury != address(0), "EPLManagement: Set zero address");

        treasury = _newTreasury;
    }
}
