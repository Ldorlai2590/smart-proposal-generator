import { FlatCompat } from '@eslint/eslintrc'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({ baseDirectory: __dirname })

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // Forzar siempre `import { z } from 'zod/v4'`. Zod v3 rompe AI SDK 4.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'zod',
              message:
                "Usa 'zod/v4' en lugar de 'zod'. Zod v3 rompe el tipado de AI SDK 4. Ver CLAUDE.md.",
            },
          ],
        },
      ],
    },
  },
]

export default eslintConfig
