// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

import {Dbay} from './Dbay.sol';

contract ExposedDbay is Dbay{
    function _findGoodById(uint32 goodId) public view isUser returns(Good memory){
        Good memory good = findGoodById(goodId);
        return good;
    }
}