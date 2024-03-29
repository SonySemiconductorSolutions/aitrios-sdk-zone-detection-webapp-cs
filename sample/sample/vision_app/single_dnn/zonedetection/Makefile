############################################################################
# Copyright 2023 Sony Semiconductor Solutions Corp. All rights reserved.
# 
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
# 
#     http://www.apache.org/licenses/LICENSE-2.0
# 
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
############################################################################

# Non-customizable area
BINPATH=/opt/wasi-sdk/bin
THIRD_PARTY_PATH=/root/third_party
CC        = $(BINPATH)/clang
CPP       = $(BINPATH)/clang++
CFLAGS    = --sysroot=/opt/wasi-sdk/share/wasi-sysroot/ \
            -I ./include \
            -I /root/schema \
            -I /root/vision_app_sdk/include \
            -I $(THIRD_PARTY_PATH)/include \
            -I $(THIRD_PARTY_PATH)/include/parson
CPPFLAGS := $(CFLAGS)
LDFLAGS   = --sysroot=/opt/wasi-sdk/share/wasi-sysroot/ \
            -pthread \
            -Wl,--shared-memory \
            -Wl,--no-check-features \
            -Wl,--no-entry \
            -Wl,--allow-undefined \
            -Wl,--export=malloc \
            -Wl,--export=free \
            -Wl,--export=__heap_base \
            -Wl,--export=__data_end

# Customizable area
USER_CFLAGS    = -O2
USER_CPPFLAGS  = $(USER_CFLAGS)
USER_LDFLAGS   = -z stack-size=32768 \
                 -Wl,--initial-memory=65536,--max-memory=2097152
CFLAGS        += $(USER_CFLAGS)
CPPFLAGS      += $(USER_CPPFLAGS) \
                -I /root/sample/include/zonedetection \
                -I /root/sample/post_process/zonedetection/include
LDFLAGS       += $(USER_LDFLAGS)
CPPOBJS        = ./src/vision_app_zonedetection.o \
                /root/sample/post_process/zonedetection/src/analyzer_zonedetection.o \
                /root/third_party/parson/parson.o
TARGET         = vision_app_zonedetection

%.o: %.c
	$(CC) $(CFLAGS) -o $@ -c $<

%.o: %.cpp
	$(CPP) $(CPPFLAGS) -o $@ -c $<

ALL: $(CPPOBJS)
	$(CPP) $(LDFLAGS) -o $(TARGET).wasm $(CPPOBJS)

clean:
	rm -rf *.o *.wasm $(CPPOBJS)
	find $(THIRD_PARTY_PATH)/ -name "*.o" -type f -delete
