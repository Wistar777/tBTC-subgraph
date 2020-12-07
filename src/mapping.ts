import { BigInt } from "@graphprotocol/graph-ts"
import { TBTCToken, Approval, Transfer } from "../generated/TBTCToken/TBTCToken"
import { _Transfer, _Approval } from "../generated/schema"

export function handleTransfer(event: Transfer): void {
  let entity = _Transfer.load(event.params.value.toHex())

  if (entity == null) {
    entity = new _Transfer(event.params.value.toHex())
    entity.count = BigInt.fromI32(0)
  }

  entity.count = entity.count + BigInt.fromI32(1)
  entity._from = event.params.from
  entity._to = event.params.to
  entity._value = event.params.value
  entity.save()
}

export function handleApproval(event: Approval): void {
  let entity = _Approval.load(event.params.value.toHex())

  if (entity == null) {
    entity = new _Approval(event.params.value.toHex())
    entity.count = BigInt.fromI32(0)
  }

  entity.count = entity.count + BigInt.fromI32(1)
  entity._owner = event.params.owner
  entity._spender = event.params.spender
  entity._value = event.params.value
  entity.save()
}
