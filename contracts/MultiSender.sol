//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
    @title MultiSender contract
    @dev This contract supports sending NFT items (ERC-721) to multiple Receivers
    Note: This contract has been deployed on Binance Smart Chain and yet not been audited
        Please check the code carefully if you doubt on the implementation
    Free to use, but at your own risk
*/
contract MultiSender {

    /**
        @notice Send NFT items to multiple Users (ERC-721 only)
        @dev  Caller can be ANY
        @param _nft                 Address of NFT contract (ERC-721) that holds NFT items
        @param _distributor         Owner of NFT items and request to distribute items to Receivers
        @param _userAddrs           A list of Receivers
        @param _tokenIds            A list of `tokenId` that needs to be transferred to Receivers respectively
        Note: 
            - Receiver can be either a wallet or a contract address
                + A wallet: no requirement
                + A contract: make sure a receiving contract inherits `ERC721Holder`. Otherwise, request is reverted likely
            - Distributor:
                + Must setApprovalForAll(this, true) to allow `operator` transfer items
                + Must setApprovalForAll(this, false) to disable
    */
    function send (
        address _nft,
        address _distributor,
        address[] calldata _userAddrs,
        uint256[] calldata _tokenIds
    ) external {
        uint256 _length = _userAddrs.length;
        require(_length == _tokenIds.length, "Length mismatch");

        IERC721 _nftContr = IERC721(_nft);
        for (uint256 i; i < _length; i++) {
            _nftContr.transferFrom(_distributor, _userAddrs[i], _tokenIds[i]);
        }
    }
}
