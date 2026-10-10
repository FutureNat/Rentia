import {z} from 'zod';

// Reads an optional raw JSON field through a lenient conversion (e.g. Number(value||0)),
// matching how routes accepted form values before validation moved to zod.
// A missing key is converted from undefined instead of failing.
export function field<T>(convert:(value:unknown)=>T) {
  return z.unknown().optional().transform(convert);
}
