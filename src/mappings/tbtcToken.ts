import {
  DailyTransferAggregation,
  MontlyTransferAggregation,
  TokenHolder,
  Governance,
} from "../../generated/schema";
import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  Approval as ApprovalEvent,
  Transfer as TranferEvent,
  TBTCToken,
} from "../../generated/TBTCToken/TBTCToken";
import { Approval, Transfer } from "../../generated/schema";
import { getOrCreateBlock, getOrCreateTransaction } from "../utils/commons";
import { EMPTY_ADDRESS_STRING } from "../utils/const";

// Note: If a handler doesn't require existing field values, it is faster
// _not_ to load the entity from the store. Instead, create it fresh with
// `new Entity(...)`, set the fields that should be updated and save the
// entity back to the store. Fields that were not set or unset remain
// unchanged, allowing for partial updates to be applied.

// It is also possible to access smart contracts from mappings. For
// example, the contract that has emitted the event can be connected to
// with:
//
// let contract = Contract.bind(event.address)
//
// The following functions can then be called on this contract to access
// state variables and other data:
//
// - contract.DECIMALS(...)
// - contract.INITIAL_SUPPLY(...)
// - contract.NAME(...)
// - contract.SYMBOL(...)
// - contract.allowance(...)
// - contract.approve(...)
// - contract.approveAndCall(...)
// - contract.balanceOf(...)
// - contract.decimals(...)
// - contract.decreaseAllowance(...)
// - contract.increaseAllowance(...)
// - contract.name(...)
// - contract.symbol(...)
// - contract.totalSupply(...)
// - contract.transfer(...)
// - contract.transferFrom(...)

export function handleApproval(event: ApprovalEvent): void {
  let block = getOrCreateBlock(event);
  let transaction = getOrCreateTransaction(
    event,
    block.id,
    block.timestamp as BigInt
  );

  let approvalId =
    event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let entity = Approval.load(approvalId);
  if (entity == null) {
    entity = new Approval(approvalId);
    entity.spender = event.params.spender;
    entity.owner = event.params.owner;
    entity.value = event.params.value;
    entity.timestamp = block.timestamp;
    entity.transaction = transaction.id;
    entity.save();
  }
}

export function handleTransfer(event: TranferEvent): void {
  let block = getOrCreateBlock(event);
  let transaction = getOrCreateTransaction(
    event,
    block.id,
    block.timestamp as BigInt
  );

  let transferId =
    event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let transfer = Transfer.load(transferId);
  if (transfer == null) {
    transfer = new Transfer(transferId);
    transfer.from = event.params.from;
    transfer.to = event.params.to;
    transfer.value = event.params.value.toBigDecimal();
    transfer.timestamp = block.timestamp;
    transfer.transaction = transaction.id;
    transfer.save();
  }

  // Governance:
  let contract = TBTCToken.bind(event.address);
  let governance = Governance.load("GOVERNANCE");
  if (governance == null) {
    governance = new Governance("GOVERNANCE");
    governance.name = contract.name();
    governance.symbol = contract.symbol();
    governance.decimals = contract.decimals();
    governance.maxSupply = contract.totalSupply();
    governance.contractAddress = event.address.toHex();
    governance.tokenHolders = BigInt.fromI32(0);
    governance.save();
  }

  // TokenHolder:
  if (event.params.from.toHex() != EMPTY_ADDRESS_STRING) {
    let tokenHolderFrom = TokenHolder.load(event.params.from.toHex());
    tokenHolderFrom.tokenBalance = tokenHolderFrom.tokenBalance.minus(
      event.params.value
    );
    tokenHolderFrom.transfersCount = tokenHolderFrom.transfersCount.plus(
      BigInt.fromI32(1)
    );
    tokenHolderFrom.save();
    if (tokenHolderFrom.tokenBalance.equals(BigInt.fromI32(0))) {
      governance.tokenHolders = governance.tokenHolders.minus(
        BigInt.fromI32(1)
      );
      governance.save();
    }
  }

  if (event.params.to.toHex() != EMPTY_ADDRESS_STRING) {
    let tokenHolderTo = TokenHolder.load(event.params.to.toHex());
    if (tokenHolderTo == null) {
      tokenHolderTo = new TokenHolder(event.params.to.toHex());
      tokenHolderTo.tokenBalance = event.params.value;
      tokenHolderTo.transfersCount = BigInt.fromI32(1);
      governance.tokenHolders = governance.tokenHolders.plus(BigInt.fromI32(1));
      governance.save();
    } else {
      if (tokenHolderTo.tokenBalance.equals(BigInt.fromI32(0))) {
        governance.tokenHolders = governance.tokenHolders.plus(BigInt.fromI32(1));
        governance.save();
      }
      tokenHolderTo.tokenBalance = tokenHolderTo.tokenBalance.plus(
        event.params.value
      );
      tokenHolderTo.transfersCount = tokenHolderTo.transfersCount.plus(
        BigInt.fromI32(1)
      );
    }
    tokenHolderTo.save();
  }
}