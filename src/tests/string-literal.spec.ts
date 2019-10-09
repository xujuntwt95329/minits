import test from 'ava';
import { runCode } from './util';

const srcStringElem = `
function main(): number {
  let s = "Hello";
  if (s[0] !== "H") {
      return 1;
  }
  if (s[1] !== "e") {
      return 1;
  }
  if (s[4] !== "o") {
      return 1;
  }
  return 0;
}
`;

const srcStringLength = `
function main(): number {
  let s = "Hello";
  return s.length
}
`;

const srcStringConcat = `
function main(): number {
  let a = "Hello";
  let b = "World";
  let c = a + " " + b;
  return c.length
}
`;

test('test string elem', async t => {
  if (await runCode(srcStringElem)) {
    t.pass();
  } else {
    t.fail();
  }
});

test('test string length', async t => {
  if (await runCode(srcStringLength)) {
    t.pass();
  } else {
    t.fail();
  }
});

test('test string concat', async t => {
  if (await runCode(srcStringConcat)) {
    t.pass();
  } else {
    t.fail();
  }
});