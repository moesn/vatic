import type {
  NormalizedOutputOptions,
  OutputBundle,
  OutputChunk,
} from 'rollup';
import type { PluginOption } from 'vite';

import { EOL } from 'node:os';

import { dateUtil, readPackageJSON } from '@vatic/node-utils';

/**
 * 用于注入版权信息
 * @returns
 */

async function viteLicensePlugin(
  root = process.cwd(),
): Promise<PluginOption | undefined> {
  const {
    description = '',
    homepage = '',
    version = '',
  } = await readPackageJSON(root);

  return {
    apply: 'build',
    enforce: 'post',
    generateBundle: {
      handler: (_options: NormalizedOutputOptions, bundle: OutputBundle) => {
        const date = dateUtil().format('YYYY-MM-DD ');
        const copyrightText = `/*!
  * Vatic Admin
  * Version: ${version}
  * Author: vatic
  * Copyright (C) 2024 Vatic
  * License: MIT License
  * Description: ${description}
  * Date Created: ${date}
  * Homepage: ${homepage}
  * Contact: ann.vatic@gmail.com
*/
              `.trim();

        for (const [, fileContent] of Object.entries(bundle)) {
          if (fileContent.type === 'chunk' && fileContent.isEntry) {
            const chunkContent = fileContent as OutputChunk;
            // 插入版权信息
            const content = chunkContent.code;
            const updatedContent = `${copyrightText}${EOL}${content}`;

            // 更新bundle
            (fileContent as OutputChunk).code = updatedContent;
          }
        }
      },
      order: 'post',
    },
    name: 'vite:license',
  };
}

export { viteLicensePlugin };
