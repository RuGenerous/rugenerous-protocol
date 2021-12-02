pragma solidity ^0.5.16;

pragma experimental ABIEncoderV2;

interface RugInterface {
    function delegateBySig(address delegatee, uint nonce, uint expiry, uint8 v, bytes32 r, bytes32 s) external;
}

interface XRugInterface {
    function syncDelegate(address user) external;
}

contract MultiDelegator {

    RugInterface public rug;
    XRugInterface srug;

    constructor (RugInterface _inv, XRugInterface _srug) public {
        rug = _inv;
        srug = _srug;
    }

    function delegateBySig(address delegatee, address[] memory delegator, uint[] memory nonce, uint[] memory expiry, uint8[] memory v, bytes32[] memory r, bytes32[] memory s) public {
        for (uint256 i = 0; i < nonce.length; i++) {
            rug.delegateBySig(delegatee, nonce[i], expiry[i], v[i], r[i], s[i]);
            srug.syncDelegate(delegator[i]);
        }
    }
}