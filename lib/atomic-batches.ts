// Keep each order and its replacement lines in one transaction. The target is
// a batch size, never a cap on the number of orders that can be imported.
export function* atomicBatches<T>(groups:Iterable<T[]>,target=50):Generator<T[]> {
  let batch:T[]=[];
  for(const group of groups) {
    if(batch.length&&batch.length+group.length>target){yield batch;batch=[];}
    batch.push(...group);
  }
  if(batch.length)yield batch;
}
