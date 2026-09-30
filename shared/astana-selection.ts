// A choice belongs to the roster revision displayed when the operator made it.
export function selectionAtRevision<T>(selection:{revision:number;value:T}|null,revision:number,empty:T):T {
 return selection?.revision===revision?selection.value:empty;
}
