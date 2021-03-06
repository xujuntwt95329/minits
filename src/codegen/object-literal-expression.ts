import crypto from 'crypto';
import llvm from 'llvm-node';
import ts from 'typescript';

import LLVMCodeGen from '.';

export default class GenObject {
  private cgen: LLVMCodeGen;

  constructor(cgen: LLVMCodeGen) {
    this.cgen = cgen;
  }

  public getObjectLiteralTypeName(memberTypes: llvm.Type[]): string {
    const data = memberTypes.map(t => t.typeID).join('-');
    const prefix = 'TypeLiteral-';
    const suffix = crypto
      .createHash('md5')
      .update(data)
      .digest()
      .toString('hex');
    return prefix + suffix;
  }

  public genObjectLiteralType(type: ts.TypeLiteralNode): llvm.Type {
    const memberTypes: llvm.Type[] = [];
    type.members.forEach(m => memberTypes.push(this.cgen.genType((m as ts.PropertySignature).type!)));
    const name = this.getObjectLiteralTypeName(memberTypes);
    if (!this.cgen.module.getTypeByName(name)) {
      const structType = llvm.StructType.create(this.cgen.context, name);
      structType.setBody(memberTypes, false);
    }
    return this.cgen.module.getTypeByName(name)!.getPointerTo();
  }

  public genObjectLiteralExpression(node: ts.ObjectLiteralExpression): llvm.Value {
    const members: llvm.Value[] = [];
    for (const p of node.properties) {
      const e = this.cgen.genExpression((p as ts.PropertyAssignment).initializer);
      members.push(e);
    }
    const memberTypes = members.map(e => e.type);
    const name = (() => {
      if (this.cgen.currentType) {
        return this.cgen.currentType!.getText();
      } else {
        return this.getObjectLiteralTypeName(memberTypes);
      }
    })();
    if (!this.cgen.module.getTypeByName(name)) {
      const structType = llvm.StructType.create(this.cgen.context, name);
      structType.setBody(memberTypes, false);
    }
    if (this.cgen.currentFunction) {
      return this.genObjectLiteralExpressionLocale(this.cgen.module.getTypeByName(name)!, members);
    } else {
      return this.genObjectLiteralExpressionGlobal(this.cgen.module.getTypeByName(name)!, members);
    }
  }

  public genObjectLiteralExpressionLocale(structType: llvm.StructType, values: llvm.Value[]): llvm.Value {
    const alloc = this.cgen.builder.createAlloca(structType);
    for (let i = 0; i < values.length; i++) {
      const ptr = this.cgen.builder.createInBoundsGEP(alloc, [
        llvm.ConstantInt.get(this.cgen.context, 0, 32, true),
        llvm.ConstantInt.get(this.cgen.context, i, 32, true)
      ]);
      this.cgen.builder.createStore(values[i], ptr);
    }
    return alloc;
  }

  public genObjectLiteralExpressionGlobal(structType: llvm.StructType, values: llvm.Value[]): llvm.Value {
    const argInitializer = llvm.ConstantStruct.get(structType, values as llvm.Constant[]);
    const argLinkage = llvm.LinkageTypes.ExternalLinkage;
    return new llvm.GlobalVariable(this.cgen.module, structType, false, argLinkage, argInitializer);
  }
}
