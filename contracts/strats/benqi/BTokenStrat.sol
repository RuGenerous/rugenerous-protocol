//SPDX-License-Identifier: Unlicense
pragma solidity 0.7.3;

import "../IStrat.sol";
import "./IBToken.sol";
import "../../vault/IVault.sol";
import "../../misc/Timelock.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

contract BTokenStrat is IStrat {
    
    using SafeERC20 for IERC20;
    IVault public vault;
    IBToken public bToken;
    IERC20 public underlying;
    Timelock public timelock;

    modifier onlyVault {
        require(msg.sender == address(vault));
        _;
    }

    constructor(IVault vault_, IBToken bToken_) {
        vault = vault_;
        bToken = bToken_;
        timelock = new Timelock(msg.sender, 7 days);
        underlying = IERC20(bToken_.underlying());
        underlying.safeApprove(address(bToken), uint(-1));
    }

    function invest() external override onlyVault {
        uint balance = underlying.balanceOf(address(this));
        require(balance > 0);
        require(bToken.mint(balance) == 0);
    }

    function divest(uint amount) external override onlyVault {
        require(bToken.redeemUnderlying(amount) == 0);
        underlying.safeTransfer(address(vault), amount);
    }

    function calcTotalValue() external override returns (uint) {
        return bToken.balanceOfUnderlying(address(this));
    }

    // IMPORTANT: This function can only be called by the timelock to recover any token amount including deposited bTokens
    // However, the owner of the timelock must first submit their request and wait 7 days before confirming.
    // This gives depositors a good window to withdraw before a potentially malicious escape
    // The intent is for the owner to be able to rescue funds in the case they become stuck after launch
    // However, users should not trust the owner and watch the timelock contract least once a week on Etherscan
    // In the future, the timelock contract will be destroyed and the functionality will be removed after the code gets audited
    function rescue(address _token, address _to, uint _amount) external {
        require(msg.sender == address(timelock));
        IERC20(_token).transfer(_to, _amount);
    }

    // Any tokens (other than the bToken) that are sent here by mistake are recoverable by the vault owner
    function sweep(address _token) external {
        address owner = vault.owner();
        require(msg.sender == owner);
        require(_token != address(bToken));
        IERC20(_token).transfer(owner, IERC20(_token).balanceOf(address(this)));
    }

}