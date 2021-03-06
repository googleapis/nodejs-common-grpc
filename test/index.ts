// Copyright 2017 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as assert from 'assert';
import {describe, it} from 'mocha';
import * as grpcCommon from '../src';

describe('grpc-common', () => {
  it('should correctly export the common modules', () => {
    assert(grpcCommon.Service);
    assert(grpcCommon.Service.ObjectToStructConverter);
    assert(grpcCommon.ServiceObject);
    assert(grpcCommon.Operation);
    assert(grpcCommon.grpc);
    assert(grpcCommon.util);
  });
});
