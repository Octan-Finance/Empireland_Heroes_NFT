//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface INFTToken {
    function mint(address _to, uint256 _fromID, uint256 _amount) external;
}
