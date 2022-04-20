//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract DAO {
    using Counters for Counters.Counter;

    Counters.Counter private _voteCounter;

    using SafeERC20 for IERC20;

    IERC20 public immutable voteToken;
    address public immutable owner;
    address public immutable chairperson;
    uint256 public minimumQuorum;
    uint256 public debatingPeriodDuration;

    struct Proposal {
        address recipient;
        string description;
        uint256 finishAt;
        uint256 pros;
        uint256 cons;
        mapping(address => bool) voted;
        bool active;
    }

    struct Elector {
        uint256 balance;
        uint256 canClaimAt;
    }

    mapping(uint256 => Proposal) private _proposals;
    mapping(uint256 => bytes) private _callDataProposals;
    mapping(address => Elector) private _electors;

    event Withdraw(address elector, uint256 amount);
    event Deposit(address elector, uint256 amount);
    event Vote(uint256 id, address elector, uint256 amount, bool support);
    event FinishProposal(uint256 id, uint256 pros, uint256 cons, uint256 total, bool status);

    modifier onlyChairperson {
        require(msg.sender == chairperson, "Caller is not the chairperson");
        _;
    }

    modifier onlyOwner {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }
    /**
    * @param _chairperson Address chairman
    * @
    */
    constructor(
        address _chairperson,
        address _voteToken,
        uint256 _minimumQuorum,
        uint256 _debatingPeriodDuration
    ) {
        owner = msg.sender;
        chairperson = _chairperson;
        voteToken = IERC20(_voteToken);
        minimumQuorum = _minimumQuorum;
        debatingPeriodDuration = _debatingPeriodDuration;
    }

    function deposit(uint256 _amount) external {
        voteToken.safeTransferFrom(msg.sender, address(this), _amount);
        _electors[msg.sender].balance = _amount;

        emit Deposit(msg.sender, _amount);
    }

    function vote(uint256 _id, bool _support) external {
        Elector storage elector = _electors[msg.sender];
        uint256 electorBalance = elector.balance;
        require(electorBalance > 0, "You don't have tokens");

        Proposal storage proposal = _proposals[_id];
        require(!proposal.voted[msg.sender], "You've already done the voice");

        /// User can claim his own tokens after the end of the last proposal
        if (proposal.finishAt > elector.canClaimAt) elector.canClaimAt = proposal.finishAt;

        if (_support) proposal.pros = proposal.pros + electorBalance;
        else proposal.cons = proposal.cons + electorBalance;

        proposal.voted[msg.sender] = true;

        emit Vote(_id, msg.sender, electorBalance, _support);
    }

    function withdraw(uint256 _amount) external {
        require(_amount > 0, "Amount should be greater than 0");

        Elector storage elector = _electors[msg.sender];
        uint256 electorBalance = elector.balance;

        require(electorBalance > 0, "You don't have tokens");
        require(electorBalance >= _amount, "Amount greater than your balance");
        require(elector.canClaimAt <= block.timestamp, "You can withdraw after the latest proposal");

        elector.balance = electorBalance - _amount;
        voteToken.safeTransfer(msg.sender, _amount);

        emit Withdraw(msg.sender, _amount);
    }

    function addProposal(bytes calldata _signature, address _recipient, string calldata _description) external onlyChairperson {
        _voteCounter.increment();

        uint256 id = _voteCounter.current();

        _proposals[id].finishAt = block.timestamp + debatingPeriodDuration;
        _proposals[id].description = _description;
        _proposals[id].recipient = _recipient;
        _proposals[id].active = true;
        _callDataProposals[id] = _signature;
    }

    function finishProposal(uint256 _id) external {
        Proposal storage proposal = _proposals[_id];
        require(proposal.finishAt <= block.timestamp, "Debating period is not over");
        require(proposal.active, "Debate is over");

        uint256 pros = proposal.pros;
        uint256 cons = proposal.cons;
        uint256 total = pros + cons;
        bool success;

        if (total >= minimumQuorum && pros > cons) {
            (success,) = proposal.recipient.call(_callDataProposals[_id]);
        }

        delete proposal.active;

        emit FinishProposal(_id, pros, cons, total, success);
    }


    function setMinimumQuorum(uint256 _amount) external onlyOwner {
        minimumQuorum = _amount;
    }

    function setDebatingPeriodDuration(uint256 _time) external onlyOwner {
        debatingPeriodDuration = _time;
    }
}