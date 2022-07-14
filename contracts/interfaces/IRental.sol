//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IRental {
    function onLeasing(uint256 _tokenID) external view returns (uint256);
}
