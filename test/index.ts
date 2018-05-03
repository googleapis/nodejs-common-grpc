/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

import * as assert from 'assert';
import * as proxyquire from 'proxyquire';

const fakeOperation = {}
const fakeServiceObject = {};
const fakeGrpc = {};

describe('grpc-common', function() {
  let grpcCommon;

  before(function() {
    grpcCommon = proxyquire('../src', {
      './operation': fakeOperation,
      './service-object': fakeServiceObject,
      grpc: fakeGrpc,
    });
  });

  it('should correctly export the common modules', function() {
    assert(grpcCommon.Service);
    assert(grpcCommon.Service.ObjectToStructConverter);
    assert.deepEqual(grpcCommon, {
      Operation: fakeOperation,
      Service: grpcCommon.Service,
      ServiceObject: fakeServiceObject,
      grpc: fakeGrpc,
    });
  });
});
