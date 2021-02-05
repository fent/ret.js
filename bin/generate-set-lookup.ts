// Uused to generate the set-lookup.ts file

import { Project, ts, printNode } from 'ts-morph';
import * as fs from 'fs';
import path from 'path';
import * as Sets from '../lib/sets';
import { types } from '../lib/types';

const setLookupPath = path.join(__dirname, '..', 'lib', 'sets-lookup.ts');
const returnType = 'Record<string | number, boolean>';

// Cleans up by removing the existing set lookup file
try {
  fs.unlinkSync(setLookupPath);
// eslint-disable-next-line no-empty
} catch (e) {}


const config = {
  INTS: Sets.ints().set,
  WORDS: Sets.words().set,
  NOTANYCHAR: Sets.anyChar().set,
  WHITESPACE: Sets.whitespace().set,
} as const;

const project = new Project();
const file = project.createSourceFile(setLookupPath);

for (const [name, set] of Object.entries(config)) {
  const objectLiteral = set.map(token => {
    if (token.type === types.SET) {
      throw new Error('Unexpected nested set');
    }
    return ts.factory.createPropertyAssignment(
      ts.factory.createIdentifier(
        token.type === types.CHAR ? `${token.value}` : `'${token.from}-${token.to}'`,
      ),
      ts.factory.createTrue(),
    );
  });

  file.addFunction(
    {
      isExported: true,
      parameters: [],
      statements: [
        printNode(ts.factory.createReturnStatement(
          ts.factory.createObjectLiteralExpression(
            objectLiteral, true,
          ),
        )),
      ],
      name,
      docs: [{
        description: 'This function is automatically generated in bin/generate-set-lookup. DO NOT EDIT DIRECTLY.',
        tags: [{
          tagName: 'returns',
          text: `{${returnType}} A record to lookup whether a token is in the ${name} set`,
        }],
      }],
      returnType,
    },
  );
}

file.saveSync();
