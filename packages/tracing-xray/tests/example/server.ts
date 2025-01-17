import AWSXRay from 'aws-xray-sdk-core';
import { print } from 'graphql';
import { createServer, Plugin } from '@graphql-yoga/node';
import { AttributeNames, SpanNames } from '../../src';
import { schema } from './schema';

const tracingPlugin: Plugin = {
  onExecute: ({ setExecuteFn, executeFn }) => {
    setExecuteFn(async (options) => {
      const parent = new AWSXRay.Segment('parent');

      return AWSXRay.getNamespace().runAndReturn(() => {
        AWSXRay.setSegment(parent);

        return AWSXRay.captureAsyncFunc(
          SpanNames.EXECUTE,
          (segment) => {
            if (segment) {
              segment.addAttribute(
                AttributeNames.OPERATION_NAME,
                options.operationName ?? '<unnamed operation>',
              );
              segment.addAttribute(AttributeNames.SOURCE, print(options.document));
            }

            return executeFn(options);
          },
          parent,
        );
      });
    });
  },
};

const server = createServer({
  schema,
  plugins: [tracingPlugin],
  maskedErrors: false,
});

server.start().catch(console.error);
