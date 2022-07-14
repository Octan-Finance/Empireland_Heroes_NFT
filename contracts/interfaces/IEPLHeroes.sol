// SPDX-License-Identifier: None
pragma solidity ^0.8.0;

interface IEPLHeroes {
    function nonces(uint256 _tokenId, address _account) external view returns (uint256);
}