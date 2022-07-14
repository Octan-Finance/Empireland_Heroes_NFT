// SPDX-License-Identifier: None
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Token721 is ERC721 {
    
    constructor() ERC721("Token721", "T721") {}

    function mint(address _to, uint256 _fromID, uint256 _amount) external {
        for (uint256 i = _fromID; i < _fromID + _amount; i++) {
			_safeMint(_to, i);
		}
    }
}
