/****************************************************************************
 * Copyright 2023, 2024 Sony Semiconductor Solutions Corp. All rights reserved.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * 
 ****************************************************************************/

#include <stdio.h>
#include <string.h>
#include <stdint.h>
#include <stdlib.h>
#include <vector>
#include <pthread.h>

#include "vision_app_public.h"
#include "analyzer_zonedetection.h"
#include "zonedetection_generated.h"

#include <map>

/* -------------------------------------------------------- */
/* define                                                   */
/* -------------------------------------------------------- */
#define PPL_DNN_OUTPUT_TENSOR_SIZE(dnnOutputDetections)  ((dnnOutputDetections * 4) + dnnOutputDetections + dnnOutputDetections + 1)    // bbox(dnnOutputDetections*4)+class(dnnOutputDetections)+scores(dnnOutputDetections)+numOfDetections(1) 

extern pthread_mutex_t g_libc_mutex;

/* -------------------------------------------------------- */
/* macro define                                             */
/* -------------------------------------------------------- */
#define PPL_ERR_PRINTF(fmt, ...) MUTEX_LOCK();fprintf(stderr, "E [VisionAPP] " fmt "\n", ##__VA_ARGS__);MUTEX_UNLOCK();
#define PPL_WARN_PRINTF(fmt, ...) MUTEX_LOCK();fprintf(stderr, "W [VisionAPP] " fmt "\n", ##__VA_ARGS__);MUTEX_UNLOCK();
#define PPL_INFO_PRINTF(fmt, ...) MUTEX_LOCK();fprintf(stdout, "I [VisionAPP] " fmt "\n", ##__VA_ARGS__);MUTEX_UNLOCK();
#define PPL_DBG_PRINTF(fmt, ...) MUTEX_LOCK();printf( "D [VisionAPP] " fmt "\n", ##__VA_ARGS__);MUTEX_UNLOCK();
#define PPL_VER_PRINTF(fmt, ...) MUTEX_LOCK();printf( "V [VisionAPP] " fmt "\n", ##__VA_ARGS__);MUTEX_UNLOCK();
#define MUTEX_LOCK() pthread_mutex_lock(&g_libc_mutex);
#define MUTEX_UNLOCK() pthread_mutex_unlock(&g_libc_mutex);

/* -------------------------------------------------------- */
/* structure                                                */
/* -------------------------------------------------------- */
typedef struct tagBbox {
    float x_min;
    float y_min;
    float x_max;
    float y_max;
} Bbox;

typedef struct tagObjectDetectionSsdOutputTensor {
    float numOfDetections;
    std::vector<Bbox> bboxes;
    std::vector<float> scores;
    std::vector<float> classes;
} ObjectDetectionSsdOutputTensor;

typedef struct tagPPL_Bbox {
    uint16_t    m_xmin;
    uint16_t    m_ymin;
    uint16_t    m_xmax;
    uint16_t    m_ymax;
} PPL_Bbox;

typedef struct tagObjectDetectionSsdData {
    uint8_t numOfDetections = 0;
    std::vector<PPL_Bbox> v_bbox;
    std::vector<float> v_scores;
    std::vector<uint8_t> v_classes;
} ObjectDetectionSsdData;

typedef struct tagAnalyzeIouData {
    uint8_t numOfDetections = 0;
    std::vector<PPL_Bbox> v_bbox;
    std::vector<float> v_scores;
    std::vector<uint8_t> v_classes;
    std::vector<float> iou;
    std::vector<uint8_t> zoneflag;
} AnalyzeIouData;

/* -------------------------------------------------------- */
/* static                                                   */
/* -------------------------------------------------------- */
static int createObjectDetectionSsdData(float *data_body, uint32_t detect_num, ObjectDetectionSsdOutputTensor *objectdetection_output);
static void analyzeObjectDetectionSsdOutput(ObjectDetectionSsdOutputTensor out_tensor, ObjectDetectionSsdData *output_objectdetection_data, PPL_CustomParam custom_param);
static void createCustomOutputFlatbuffer(flatbuffers::FlatBufferBuilder* builder, const AnalyzeIouData* ssdData);
static EPPL_RESULT_CODE PPL_CustomParamInit(JSON_Value *root_value, PPL_CustomParam *p_custom_param);
static EPPL_RESULT_CODE PPL_Custom_Analyze(ObjectDetectionSsdData *data, AnalyzeIouData *output_analyze_data, PPL_CustomParam *p_custom_param);

/* -------------------------------------------------------- */
/* public function                                          */
/* -------------------------------------------------------- */
/**
 * @brief PPL_ObjectDetectionSsdAnalyze
 */
EPPL_RESULT_CODE PPL_ObjectDetectionSsdAnalyze(float *p_data, uint32_t in_size, void **pp_out_buf,  uint32_t *p_out_size, PPL_CustomParam custom_param) {

    uint8_t *p_out_param = NULL;
    ObjectDetectionSsdOutputTensor objectdetection_output;
    ObjectDetectionSsdData output_objectdetection_data;
    AnalyzeIouData output_analyze_data;

    PPL_DBG_PRINTF("PPL_ObjectDetectionSsdAnalyze");

    if (p_data == NULL) {
        PPL_ERR_PRINTF("PPL:Invalid param : pdata=NULL");
        return E_PPL_INVALID_PARAM;
    }

    if (in_size != (uint32_t)(PPL_DNN_OUTPUT_TENSOR_SIZE(custom_param.dnnOutputDetections))) {
        PPL_ERR_PRINTF("PPL:Unexpected value for : in_size %d",in_size);
        PPL_ERR_PRINTF("PPL:Expected value for : in_size %d",(uint32_t)(PPL_DNN_OUTPUT_TENSOR_SIZE(custom_param.dnnOutputDetections)));
        return E_PPL_INVALID_PARAM;
    }

    /* call interface process */
    int ret = createObjectDetectionSsdData(p_data, custom_param.dnnOutputDetections, &objectdetection_output);
    if (ret != 0) {
        PPL_ERR_PRINTF("PPL: Error in createObjectDetectionData");
        return E_PPL_OTHER;
    }

    /* call analyze process */
    analyzeObjectDetectionSsdOutput(objectdetection_output, &output_objectdetection_data, custom_param);

//======================PPL_Custom_Analyze()==========================//
    PPL_Custom_Analyze(&output_objectdetection_data, &output_analyze_data, &custom_param);

    /* serialize output data to flatbuffer */
    MUTEX_LOCK();
    flatbuffers::FlatBufferBuilder* builder = new flatbuffers::FlatBufferBuilder();
    MUTEX_UNLOCK();

    createCustomOutputFlatbuffer(builder,&output_analyze_data);

    MUTEX_LOCK();
    uint8_t* buf_ptr = builder->GetBufferPointer();
    MUTEX_UNLOCK();

    if (buf_ptr == NULL) {
        PPL_ERR_PRINTF("Error could not create Flatbuffer");
        MUTEX_LOCK();
        builder->Clear();
        MUTEX_UNLOCK();

        MUTEX_LOCK();
        delete(builder);
        MUTEX_UNLOCK();

        return E_PPL_OTHER;
    }

    MUTEX_LOCK();
    uint32_t buf_size = builder->GetSize();
    MUTEX_UNLOCK();

    MUTEX_LOCK();
    p_out_param = (uint8_t *)SessMalloc(buf_size);
    MUTEX_UNLOCK();

    if (p_out_param == NULL) {
        PPL_ERR_PRINTF("malloc failed for creating flatbuffer, malloc size=%d", buf_size);
        MUTEX_LOCK();
        builder->Clear();
        MUTEX_UNLOCK();

        MUTEX_LOCK();
        delete(builder);
        MUTEX_UNLOCK();

        return E_PPL_E_MEMORY_ERROR;
    }
    PPL_DBG_PRINTF("p_out_param = %p", p_out_param);

    /* Copy Data */
    MUTEX_LOCK();
    memcpy(p_out_param, buf_ptr, buf_size);
    MUTEX_UNLOCK();
    
    *pp_out_buf = p_out_param;
    *p_out_size = buf_size;

    //Clean up
    MUTEX_LOCK();
    builder->Clear();
    MUTEX_UNLOCK();

    MUTEX_LOCK();
    delete(builder);
    MUTEX_UNLOCK();

    return E_PPL_OK;
}

/**
 * json_parse: get json data from json_object and update in local struct
 * 
 * @param param Pointer to json string containing PPL specific parameters
 * @return Success or failure EPPL_RESULT_CODE
 */
EPPL_RESULT_CODE json_parse(JSON_Value *root_value, PPL_CustomParam *p_custom_param) {
    const char *p = NULL;
    const char* ppl_id_version = PPL_ID_VERSION;

    PPL_INFO_PRINTF("PPL_Initialize: <json_parse>");
    int ret;

    MUTEX_LOCK();
    ret = json_object_has_value(json_object(root_value),"header");
    MUTEX_UNLOCK();

    if (ret) {

        MUTEX_LOCK();
        ret = json_object_has_value_of_type(json_object(root_value),"header",JSONObject);
        MUTEX_UNLOCK();

        if (ret) {
    
            MUTEX_LOCK();
            JSON_Object *header = json_object_get_object(json_object(root_value), "header");
            MUTEX_UNLOCK();

            MUTEX_LOCK();
            ret = json_object_has_value(header,"id");
            MUTEX_UNLOCK();

            if (ret) {

                MUTEX_LOCK();
                p = json_object_get_string(header, "id");
                MUTEX_UNLOCK();

                if (p != NULL) {

                    MUTEX_LOCK();
                    ret = strncmp(ppl_id_version, p, 2);
                    MUTEX_UNLOCK();

                    if (ret == 0) {
                        PPL_DBG_PRINTF("[PPL_PUBLIC] header_id = %s",p);
                    } else {
                        PPL_DBG_PRINTF("[PPL_PUBLIC] header_id = %s",p);
                        return E_PPL_INVALID_PARAM;
                    }
                } else {
                    PPL_DBG_PRINTF("[PPL_PUBLIC] header_id is NULL");
                    return E_PPL_INVALID_PARAM;
                }
            } else {
                PPL_DBG_PRINTF("[PPL_PUBLIC] json file does not have header:id");
                return E_PPL_INVALID_PARAM;
            }

            MUTEX_LOCK();
            ret = json_object_has_value(header,"version");
            MUTEX_UNLOCK();

            if (ret) {

                MUTEX_LOCK();
                p = json_object_get_string(header, "version");
                MUTEX_UNLOCK();

                if (p != NULL) {
                    MUTEX_LOCK();
                    ret = strncmp(&ppl_id_version[3], p, 8);
                    MUTEX_UNLOCK();

                    if (ret == 0) {
                        PPL_DBG_PRINTF("[PPL_PUBLIC] header_version p = %s ppl_id_version=%s",p,&ppl_id_version[3]);
                    } else {
                        PPL_DBG_PRINTF("[PPL_PUBLIC] header_version = %s",p);
                        return E_PPL_INVALID_PARAM;
                    }
                } else {
                    PPL_DBG_PRINTF("[PPL_PUBLIC] header_version is NULL");
                    return E_PPL_INVALID_PARAM;
                }
            } else {
                PPL_DBG_PRINTF("[PPL_PUBLIC] json file does not have header:version");
                return E_PPL_INVALID_PARAM;
            }
        }
    }
    return PPL_CustomParamInit(root_value, p_custom_param);
}

/* -------------------------------------------------------- */
/* private function                                         */
/* -------------------------------------------------------- */
static EPPL_RESULT_CODE PPL_CustomParamInit(JSON_Value *root_value, PPL_CustomParam *p_custom_param) {
    PPL_INFO_PRINTF("[ROI ANALYZE] PPL_CustomParamInit ");
    int ret;

    MUTEX_LOCK();
    ret = json_object_has_value(json_object(root_value),"dnn_output_detections");
    MUTEX_UNLOCK();

    if (ret) {

        MUTEX_LOCK();
        uint16_t dnn_output_detections = json_object_get_number(json_object(root_value), "dnn_output_detections");
        MUTEX_UNLOCK();

        PPL_DBG_PRINTF("[ROI ANALYZE] PPL_CustomParamInit dnn_output_detections: %d", dnn_output_detections);
        p_custom_param->dnnOutputDetections = dnn_output_detections;
    } else {
        PPL_ERR_PRINTF("[ROI ANALYZE] PPL_CustomParamInit: json file does not have parameter \"dnn_output_detections\"");
        return E_PPL_INVALID_PARAM;
    }

    MUTEX_LOCK();
    ret = json_object_has_value(json_object(root_value),"max_detections");
    MUTEX_UNLOCK();

    if (ret) {

        MUTEX_LOCK();
        uint16_t maxDetections = (int)json_object_get_number(json_object(root_value), "max_detections");
        MUTEX_UNLOCK();

        PPL_DBG_PRINTF("[ROI ANALYZE] PPL_CustomParamInit max_detections: %d", maxDetections);
        if (maxDetections > p_custom_param->dnnOutputDetections) {
            PPL_WARN_PRINTF("[ROI ANALYZE] max_detections > max number of classes, set to max number of classes");
            p_custom_param->maxDetections = p_custom_param->dnnOutputDetections;
        } else {
            p_custom_param->maxDetections = maxDetections;
        }
    } else {
        PPL_ERR_PRINTF("[ROI ANALYZE] PPL_CustomParamInit: json file does not have max_detections");
        return E_PPL_INVALID_PARAM;
    }

    MUTEX_LOCK();
    ret = json_object_has_value(json_object(root_value),"mode");
    MUTEX_UNLOCK();

    if (ret){
        MUTEX_LOCK();
        uint16_t mode = (int)json_object_get_number(json_object(root_value), "mode");
        MUTEX_UNLOCK();

        PPL_DBG_PRINTF("[ROI ANALYZE] PPL_CustomParamInit Mode: %d", mode);
        p_custom_param->mode = mode;
        PPL_DBG_PRINTF("[ROI ANALYZE] PPL_CustomParamInit p_custom_param->mode: %d", p_custom_param->mode);
    } else {
        PPL_ERR_PRINTF("[ROI ANALYZE] PPL_CustomParamInit: json file does not have mode");
        return E_PPL_INVALID_PARAM;        
    }

    MUTEX_LOCK();
    ret = json_object_has_value(json_object(root_value),"zone");
    MUTEX_UNLOCK();

    if (ret){

        MUTEX_LOCK();
        ret = json_object_has_value_of_type(json_object(root_value),"zone",JSONObject);
        MUTEX_UNLOCK();

        if (ret) {

			MUTEX_LOCK();
            JSON_Object *zone = json_object_get_object(json_object(root_value), "zone");
            MUTEX_UNLOCK();

            MUTEX_LOCK();
            ret = json_object_has_value(zone,"top_left_x");
            MUTEX_UNLOCK();

            if (ret) {

                MUTEX_LOCK();
                p_custom_param->Zone.top_left_x = (int)json_object_get_number(zone, "top_left_x");
                MUTEX_UNLOCK();

                PPL_DBG_PRINTF("[ROI ANALYZE] PPL_CustomParamInit top_left_x: %d", p_custom_param->Zone.top_left_x);
            }else {
                PPL_ERR_PRINTF("[ROI ANALYZE] PPL_CustomParamInit: json file does not have top_left_x");
                return E_PPL_INVALID_PARAM;
            }

            MUTEX_LOCK();
            ret = json_object_has_value(zone,"top_left_y");
            MUTEX_UNLOCK();

            if (ret) {

                MUTEX_LOCK();
                p_custom_param->Zone.top_left_y = (int)json_object_get_number(zone, "top_left_y");
                MUTEX_UNLOCK();

                PPL_DBG_PRINTF("[ROI ANALYZE] PPL_CustomParamInit top_left_y: %d", p_custom_param->Zone.top_left_y);
            }else {
                PPL_ERR_PRINTF("[ROI ANALYZE] PPL_CustomParamInit: json file does not have top_left_y");
                return E_PPL_INVALID_PARAM;
            }

            MUTEX_LOCK();
            ret = json_object_has_value(zone,"bottom_right_x");
            MUTEX_UNLOCK();

            if (ret) {

                MUTEX_LOCK();
                p_custom_param->Zone.bottom_right_x = (int)json_object_get_number(zone, "bottom_right_x");
                MUTEX_UNLOCK();

                PPL_DBG_PRINTF("[ROI ANALYZE] PPL_CustomParamInit bottom_right_x: %d", p_custom_param->Zone.bottom_right_x);
            }else {
                PPL_ERR_PRINTF("[ROI ANALYZE] PPL_CustomParamInit: json file does not have bottom_right_x");
                return E_PPL_INVALID_PARAM;
            }

            MUTEX_LOCK();
            ret = json_object_has_value(zone,"bottom_right_y");
            MUTEX_UNLOCK();

            if (ret) {

                MUTEX_LOCK();
                p_custom_param->Zone.bottom_right_y = (int)json_object_get_number(zone, "bottom_right_y");
                MUTEX_UNLOCK();

                PPL_DBG_PRINTF("[ROI ANALYZE] PPL_CustomParamInit bottom_right_y: %d", p_custom_param->Zone.bottom_right_y);
            }else {
                PPL_ERR_PRINTF("[ROI ANALYZE] PPL_CustomParamInit: json file does not have bottom_right_y");
                return E_PPL_INVALID_PARAM;
            }
        } 
    }else {
        PPL_ERR_PRINTF("[ROI ANALYZE] PPL_CustomParamInit: json file does not have zone");
        return E_PPL_INVALID_PARAM;         
    }

    MUTEX_LOCK();
    ret = json_object_has_value(json_object(root_value),"threshold");
    MUTEX_UNLOCK();

    if (ret){

        MUTEX_LOCK();
        ret = json_object_has_value_of_type(json_object(root_value),"threshold",JSONObject);
        MUTEX_UNLOCK();

        if (ret) {

            MUTEX_LOCK();
            JSON_Object *threshold = json_object_get_object(json_object(root_value), "threshold");
            MUTEX_UNLOCK();

            MUTEX_LOCK();
            ret = ret = json_object_has_value(threshold,"iou");
            MUTEX_UNLOCK();

			if (ret) {

                MUTEX_LOCK();
                p_custom_param->iou = (float)json_object_get_number(threshold, "iou");
                MUTEX_UNLOCK();

                PPL_DBG_PRINTF("[ROI ANALYZE] PPL_CustomParamInit iou: %f", p_custom_param->iou);
            }
            else {
                PPL_ERR_PRINTF("[ROI ANALYZE] PPL_CustomParamInit: json file does not have iou");
                return E_PPL_INVALID_PARAM;
            }

            MUTEX_LOCK();
            ret = json_object_has_value(threshold,"score");
            MUTEX_UNLOCK();

            if (ret) {

                MUTEX_LOCK();
                p_custom_param->score = (float)json_object_get_number(threshold, "score");
                MUTEX_UNLOCK();

                PPL_DBG_PRINTF("[ROI ANALYZE] PPL_CustomParamInit score: %f", p_custom_param->score);
            }
            else {
                PPL_ERR_PRINTF("[ROI ANALYZE] PPL_CustomParamInit: json file does not have score");
                return E_PPL_INVALID_PARAM;
            }
        }
    }else
    {
        PPL_ERR_PRINTF("[ROI ANALYZE] PPL_CustomParamInit: json file does not have threshold");
        return E_PPL_INVALID_PARAM;         
    }

    MUTEX_LOCK();
    ret = json_object_has_value(json_object(root_value),"input_width");
    MUTEX_UNLOCK();

    if (ret) {

        MUTEX_LOCK();
        uint16_t input_width = json_object_get_number(json_object(root_value), "input_width");
        MUTEX_UNLOCK();

        PPL_DBG_PRINTF("[ROI ANALYZE] PPL_CustomParamInit input_width: %d", input_width);
        p_custom_param->inputWidth = input_width;
    } else {
        PPL_ERR_PRINTF("[ROI ANALYZE] PPL_CustomParamInit: json file does not have input_width");
        return E_PPL_INVALID_PARAM;
    }

    MUTEX_LOCK();
    ret = json_object_has_value(json_object(root_value),"input_height");
    MUTEX_UNLOCK();

    if (ret) {

        MUTEX_LOCK();
        uint16_t input_height = json_object_get_number(json_object(root_value), "input_height");
        MUTEX_UNLOCK();

        PPL_DBG_PRINTF("[ROI ANALYZE] PPL_CustomParamInit input_height: %d", input_height);
        p_custom_param->inputHeight = input_height;
    } else {
        PPL_ERR_PRINTF("[ROI ANALYZE] PPL_CustomParamInit: json file does not have \"input_height\"");
        return E_PPL_INVALID_PARAM;
    }

    return E_PPL_OK;
}

/**
 * @brief createObjectDetectionSsdData
 */
static int createObjectDetectionSsdData(float *data_body, uint32_t detect_num, ObjectDetectionSsdOutputTensor *objectdetection_output) {

    float* out_data = data_body;
    uint32_t count = 0;
    std::vector<Bbox> v_bbox;
    std::vector<float> v_scores;
    std::vector<float> v_classes;

    /* Extract number of Detections */
    uint8_t totalDetections = (uint8_t)detect_num;

    if ((count + (totalDetections * 4))> PPL_DNN_OUTPUT_TENSOR_SIZE(detect_num)) {
        PPL_ERR_PRINTF("Invalid count index %d",count);
        return -1;
    }

    //Extract bounding box co-ordinates
    for (uint8_t i = 0; i < totalDetections; i++) {
        Bbox bbox;
        bbox.y_min = out_data[count + i];
        bbox.x_min = out_data[count + i + (1 * totalDetections)];
        bbox.y_max = out_data[count + i + (2 * totalDetections)];
        bbox.x_max = out_data[count + i + (3 * totalDetections)];
        
        MUTEX_LOCK();
        v_bbox.push_back(bbox);
        MUTEX_UNLOCK();

    }
    count += (totalDetections * 4);

    //Extract class indices
    for (uint8_t i = 0; i < totalDetections; i++) {
        if (count > PPL_DNN_OUTPUT_TENSOR_SIZE(detect_num)) {
            PPL_ERR_PRINTF("Invalid count index %d",count);
            return -1;
        }
        float class_index;
        class_index = out_data[count];

        MUTEX_LOCK();
        v_classes.push_back(class_index);
        MUTEX_UNLOCK();

        count++;
    }

    //Extract scores
    for (uint8_t i = 0; i < totalDetections; i++) {
        if (count > PPL_DNN_OUTPUT_TENSOR_SIZE(detect_num)) {
            PPL_ERR_PRINTF("Invalid count index %d",count);
            return -1;
        }
        float score;
        score = out_data[count];

        MUTEX_LOCK();
        v_scores.push_back(score);
        MUTEX_UNLOCK();
        count++;
    }

    if (count > PPL_DNN_OUTPUT_TENSOR_SIZE(detect_num)) {
        PPL_ERR_PRINTF("Invalid count index %d",count);
        return -1;
    }

    //Extract number of Detections
    uint8_t numOfDetections = (uint8_t) out_data[count];

    if (numOfDetections > totalDetections) {
        PPL_WARN_PRINTF("Unexpected value for numOfDetections: %d, setting it to %d",numOfDetections,totalDetections);
        numOfDetections = totalDetections;
    }

    objectdetection_output->numOfDetections = numOfDetections;
    
    MUTEX_LOCK();
    objectdetection_output->bboxes = v_bbox;
    MUTEX_UNLOCK();

    MUTEX_LOCK();
    objectdetection_output->scores = v_scores;
    MUTEX_UNLOCK();

    MUTEX_LOCK();
    objectdetection_output->classes = v_classes;
    MUTEX_UNLOCK();

    return 0;
}

/**
 * @brief analyzeObjectDetectionSsdOutput
 */
static void analyzeObjectDetectionSsdOutput(ObjectDetectionSsdOutputTensor out_tensor, ObjectDetectionSsdData *output_objectdetection_data, PPL_CustomParam custom_param) {

    uint8_t num_of_detections;
    uint8_t detections_above_threshold = 0;
    std::vector<PPL_Bbox> v_bbox;
    std::vector<float> v_scores;
    std::vector<uint8_t> v_classes;
    ObjectDetectionSsdData objectdetection_data;

    /* Extract number of detections */
    num_of_detections = (uint8_t)out_tensor.numOfDetections;

    for (uint8_t i = 0; i < num_of_detections; i++) {

        /* Extract scores */
        float score;

        MUTEX_LOCK();
        score = out_tensor.scores[i];
        MUTEX_UNLOCK();

        /* Filter Detections */
        if (score < custom_param.score) { // filter object based on object confidence score threshold
            continue;
        } else {

            MUTEX_LOCK();
            v_scores.push_back(score);
            MUTEX_UNLOCK();

            /* Extract bounding box co-ordinates */
            PPL_Bbox bbox;

            MUTEX_LOCK();
            bbox.m_xmin = (uint16_t)(round((out_tensor.bboxes[i].x_min) * (custom_param.inputWidth - 1)));
            MUTEX_UNLOCK();

            MUTEX_LOCK();
            bbox.m_ymin = (uint16_t)(round((out_tensor.bboxes[i].y_min) * (custom_param.inputHeight  - 1)));
            MUTEX_UNLOCK();
            
            MUTEX_LOCK();
            bbox.m_xmax = (uint16_t)(round((out_tensor.bboxes[i].x_max) * (custom_param.inputWidth  - 1)));
            MUTEX_UNLOCK();

            MUTEX_LOCK();
            bbox.m_ymax = (uint16_t)(round((out_tensor.bboxes[i].y_max) * (custom_param.inputHeight - 1)));
            MUTEX_UNLOCK();

            MUTEX_LOCK();
            v_bbox.push_back(bbox);
            MUTEX_UNLOCK();

           /* Extract classes */
            uint8_t class_index;

            MUTEX_LOCK();
            class_index = (uint8_t)out_tensor.classes[i];
            MUTEX_UNLOCK();

            MUTEX_LOCK();
            v_classes.push_back(class_index);
            MUTEX_UNLOCK();

            detections_above_threshold++;
        }
    }

    objectdetection_data.numOfDetections = detections_above_threshold;

    MUTEX_LOCK();
    objectdetection_data.v_bbox = v_bbox;
    MUTEX_UNLOCK();
    
    MUTEX_LOCK();
    objectdetection_data.v_scores = v_scores;
    MUTEX_UNLOCK();
    
    MUTEX_LOCK();
    objectdetection_data.v_classes = v_classes;
    MUTEX_UNLOCK();
    //objectdetection_data = getActualDetections(objectdetection_data);

    if (objectdetection_data.numOfDetections > custom_param.maxDetections) {
        objectdetection_data.numOfDetections = custom_param.maxDetections;

        MUTEX_LOCK();
        objectdetection_data.v_bbox.resize(custom_param.maxDetections);
        MUTEX_UNLOCK();

        MUTEX_LOCK();
        objectdetection_data.v_classes.resize(custom_param.maxDetections);
        MUTEX_UNLOCK();

        MUTEX_LOCK();
        objectdetection_data.v_scores.resize(custom_param.maxDetections);
        MUTEX_UNLOCK();

    }

    output_objectdetection_data->numOfDetections = objectdetection_data.numOfDetections;

    MUTEX_LOCK();
    output_objectdetection_data->v_bbox = objectdetection_data.v_bbox;
    MUTEX_UNLOCK();

    MUTEX_LOCK();
    output_objectdetection_data->v_scores = objectdetection_data.v_scores;
    MUTEX_UNLOCK();

    MUTEX_LOCK();
    output_objectdetection_data->v_classes = objectdetection_data.v_classes;
    MUTEX_UNLOCK();

    PPL_DBG_PRINTF("number of detections = %d", objectdetection_data.numOfDetections);
    num_of_detections = objectdetection_data.numOfDetections;
    for (int i = 0; i < num_of_detections; i++) {

        MUTEX_LOCK();
        uint16_t xmin = objectdetection_data.v_bbox[i].m_xmin;
        MUTEX_UNLOCK();

        MUTEX_LOCK();
        uint16_t ymin = objectdetection_data.v_bbox[i].m_ymin;
        MUTEX_UNLOCK();

        MUTEX_LOCK();
        uint16_t xmax = objectdetection_data.v_bbox[i].m_xmax;
        MUTEX_UNLOCK();

        MUTEX_LOCK();
        uint16_t ymax = objectdetection_data.v_bbox[i].m_ymax;
        MUTEX_UNLOCK();

        PPL_DBG_PRINTF(
            "v_bbox[%d] :[x_min,y_min,x_max,y_max] = [%d,%d,%d,%d]",
            i,
            xmin,
            ymin,
            xmax,
            ymax
        );
    }
    for (int i = 0; i < num_of_detections; i++) {

        MUTEX_LOCK();
        float score = objectdetection_data.v_scores[i];
        MUTEX_UNLOCK();

        PPL_DBG_PRINTF("scores[%d] = %f", i, score);
    }
    for (int i = 0; i < num_of_detections; i++) {

        MUTEX_LOCK();
        uint8_t class_indice = objectdetection_data.v_classes[i];
        MUTEX_UNLOCK();

        PPL_DBG_PRINTF("class_indices[%d] = %d", i, class_indice);
    }

    return;
}

int diff_magnitude(int a, int b)
{
    int max = MAX(a,b);
    int min = MIN(a,b);
    return (max - min);
}

/**
 * @brief object_inside_zone
 * Calculate the IoU of the detected Objects. 
 * 
 * @param out_box Object Bounding Box
 * @param i index 
 * @param out_iou array pointer which holds calculate iou 
 * 
 * @return 1 if object inside zone area 
 */
uint16_t object_inside_zone(std::vector<PPL_Bbox>& out_box, int i, float *out_iou/*std::vector<float>& out_iou*/, PPL_CustomParam *p_custom_param)
{
    MUTEX_LOCK();
    int x5 = MAX(p_custom_param->Zone.top_left_x, out_box[i].m_xmin);
    MUTEX_UNLOCK();
    
    MUTEX_LOCK();
    int y5 = MAX(p_custom_param->Zone.top_left_y, out_box[i].m_ymin);
    MUTEX_UNLOCK();

    MUTEX_LOCK();
    int x6 = MIN(p_custom_param->Zone.bottom_right_x, out_box[i].m_xmax);
    MUTEX_UNLOCK();

    MUTEX_LOCK();
    int y6 = MIN(p_custom_param->Zone.bottom_right_y, out_box[i].m_ymax);
    MUTEX_UNLOCK();
    float overlap_area = 0, object_area = 0;

    if((x5 > x6) || (y5 > y6))
    {
        PPL_DBG_PRINTF("[ROI ANALYZE]: object is outside zone");
        return 0;
    }
    int x;
    int y;
    MUTEX_LOCK();
    x = diff_magnitude(x5 ,x6);
    MUTEX_UNLOCK();

    MUTEX_LOCK();
    y = diff_magnitude(y5 , y6);
    MUTEX_UNLOCK();

    overlap_area = x*y;

    MUTEX_LOCK();
    x = diff_magnitude(out_box[i].m_xmin, out_box[i].m_xmax);
    MUTEX_UNLOCK();

    MUTEX_LOCK();
    y = diff_magnitude(out_box[i].m_ymax , out_box[i].m_ymin);
    MUTEX_UNLOCK();
    object_area = x*y;
    
    *(out_iou + i) = overlap_area/object_area; // x% of object in Zone area float value
    
    return 1;
}

/**
 * @brief PPL_Custom_Analyze
 * Calculate the IoU of the detected Objects and update the Flag and IoU Output data. 
 * 
 * @param data DNN parsed data(without filter) 
 * @param output_analyze_data IoU analyzed output data
 * which is updated based on threshold for each class.
 * @return Success 
 */
static EPPL_RESULT_CODE PPL_Custom_Analyze(ObjectDetectionSsdData *data, AnalyzeIouData *output_analyze_data, PPL_CustomParam *p_custom_param) {
    uint8_t num_of_detections = 0;
    uint16_t ret = 0;
    std::vector<PPL_Bbox> out_box;
    std::vector<float> out_scores;
    std::vector<uint8_t> out_classes;
    uint8_t zoneflag[PPL_DNN_OUTPUT_DETECTIONS] = {0};
    float iou[PPL_DNN_OUTPUT_DETECTIONS] = {0};

    PPL_INFO_PRINTF("[ROI ANALYZE]: PPL_Custom_Analyze");
    if (data == NULL) // sanity check
    {
        PPL_ERR_PRINTF("[ROI ANALYZE] Invalid param : data=NULL");
        return E_PPL_INVALID_PARAM;
    }

    num_of_detections = data->numOfDetections;
    /* check param */
    if (num_of_detections > PPL_DNN_OUTPUT_DETECTIONS) {
        PPL_WARN_PRINTF("[ROI ANALYZE]: m_maxdetect > PPL_DNN_OUTPUT_DETECTIONS, Set to Max DNN_OUTPUT_DETECTIONS");
        num_of_detections = PPL_DNN_OUTPUT_DETECTIONS;
    }

    MUTEX_LOCK();
    out_box = data->v_bbox;
    MUTEX_UNLOCK();

    MUTEX_LOCK();
    out_classes = data->v_classes;
    MUTEX_UNLOCK();

    MUTEX_LOCK();
    out_scores = data->v_scores;
    MUTEX_UNLOCK();

    PPL_INFO_PRINTF("[ROI ANALYZE]: start filter");
    for (uint32_t i = 0; i < num_of_detections; i++)
    {
        if(p_custom_param->mode == 1)
        {        
            ret = object_inside_zone(out_box,i,iou,p_custom_param);
            if(ret == 1)
            {
                if(iou[i] < p_custom_param->iou)
                {
                    zoneflag[i] = 0;
                }
                else
                {
                    zoneflag[i] = 1;
                }
            }
            else
            {
                zoneflag[i] = false;
                iou[i] = 0;
            }
        }
        else{
            ret = object_inside_zone(out_box,i,iou,p_custom_param);
            if(ret == 1)
            {
                if(iou[i] < p_custom_param->iou)
                {
                    zoneflag[i] = 0;
                }
                else
                {
                    zoneflag[i] = 1;
                }
            }
            else
            {
                zoneflag[i] = 0;
                iou[i] = 0;
            }
        }
    }

    if(p_custom_param->mode == 1)
    {
        uint32_t counter = 0;
        for (uint32_t i = 0; i < num_of_detections; i++)
        {
            if(zoneflag[i])
            {
                MUTEX_LOCK();
                output_analyze_data->iou.push_back(iou[i]);
                MUTEX_UNLOCK();

                MUTEX_LOCK();
                output_analyze_data->v_bbox.push_back(out_box[i]);
                MUTEX_UNLOCK();

                MUTEX_LOCK();
                output_analyze_data->v_classes.push_back(out_classes[i]);
                MUTEX_UNLOCK();

                MUTEX_LOCK();
                output_analyze_data->v_scores.push_back(out_scores[i]);
                MUTEX_UNLOCK();

                MUTEX_LOCK();
                output_analyze_data->zoneflag.push_back(zoneflag[i]);
                MUTEX_UNLOCK();
                counter++;
            }
        }
        output_analyze_data->numOfDetections = counter;        
    }
    else
    {
        for (uint32_t i = 0; i < num_of_detections; i++)
        {
            MUTEX_LOCK();
            output_analyze_data->iou.push_back(iou[i]);
            MUTEX_UNLOCK();

            MUTEX_LOCK();
            output_analyze_data->v_bbox.push_back(out_box[i]);
            MUTEX_UNLOCK();

            MUTEX_LOCK();
            output_analyze_data->v_classes.push_back(out_classes[i]);
            MUTEX_UNLOCK();
            
            MUTEX_LOCK();
            output_analyze_data->v_scores.push_back(out_scores[i]);
            MUTEX_UNLOCK();
            
            MUTEX_LOCK();
            output_analyze_data->zoneflag.push_back(zoneflag[i]);
            MUTEX_UNLOCK();
        }
        output_analyze_data->numOfDetections = num_of_detections;
    }

    for(uint32_t i=0; i < output_analyze_data->numOfDetections; i++)
    {

        MUTEX_LOCK();
        float iou = output_analyze_data->iou[i];
        MUTEX_UNLOCK();

        MUTEX_LOCK();
        uint8_t class_indice = output_analyze_data->v_classes[i];
        MUTEX_UNLOCK();
        
        MUTEX_LOCK();
        float score = output_analyze_data->v_scores[i];
        MUTEX_UNLOCK();
        
        MUTEX_LOCK();
        uint8_t flag = output_analyze_data->zoneflag[i];
        MUTEX_UNLOCK();

        MUTEX_LOCK();
        uint16_t m_xmin = output_analyze_data->v_bbox[i].m_xmin;
        MUTEX_UNLOCK();
        
        MUTEX_LOCK();
        uint16_t m_ymin = output_analyze_data->v_bbox[i].m_ymin;
        MUTEX_UNLOCK();

        MUTEX_LOCK();
        uint16_t m_xmax = output_analyze_data->v_bbox[i].m_xmax;
        MUTEX_UNLOCK();
        
        MUTEX_LOCK();
        uint16_t m_ymax = output_analyze_data->v_bbox[i].m_ymax;
        MUTEX_UNLOCK();

        PPL_DBG_PRINTF("===========================================");   
        PPL_DBG_PRINTF("[ROI ANALYZE]: Output Data [%d]: ",i);
        PPL_DBG_PRINTF("IoU: %f",iou);
        PPL_DBG_PRINTF("Classes: %d",class_indice);
        PPL_DBG_PRINTF("Score: %f",score);
        PPL_DBG_PRINTF("ZoneFlag: %s",flag?"Unsafe Zone":"Safe Zone");
        PPL_DBG_PRINTF("Bounding Box[%d] :[x_min,y_min,x_max,y_max] = [%d,%d,%d,%d]", 
        i,
        m_xmin,
        m_ymin,
        m_xmax,
        m_ymax);
        PPL_DBG_PRINTF("===========================================");
    }
    return E_PPL_OK;
}

/* Function to serialize SSD MobilenetV1 output tensor data into Flatbuffers.
*/
static void createCustomOutputFlatbuffer(flatbuffers::FlatBufferBuilder* builder, const AnalyzeIouData* ssdData) {
    std::vector<flatbuffers::Offset<SmartCamera::GeneralObject>> gdata_vector;

    PPL_DBG_PRINTF("createFlatbuffer");
    uint8_t numOfDetections = ssdData->numOfDetections;
    for (uint8_t i = 0; i < numOfDetections; i++) {
        PPL_DBG_PRINTF("left = %d, top = %d, right = %d, bottom = %d, class = %d, score = %f, iou = %f, zoneflag = %s", 
        ssdData->v_bbox[i].m_xmin, 
        ssdData->v_bbox[i].m_ymin, 
        ssdData->v_bbox[i].m_xmax, 
        ssdData->v_bbox[i].m_ymax, 
        ssdData->v_classes[i], 
        ssdData->v_scores[i], 
        ssdData->iou[i], 
        ssdData->zoneflag[i]?"True":"False");
        MUTEX_LOCK();
        auto bbox_data = SmartCamera::CreateBoundingBox2d(*builder, ssdData->v_bbox[i].m_xmin, \
            ssdData->v_bbox[i].m_ymin, \
            ssdData->v_bbox[i].m_xmax, \
            ssdData->v_bbox[i].m_ymax);
        MUTEX_UNLOCK();
        PPL_DBG_PRINTF("[IoU_Analyze] createFlatbuffer : general_data");
        MUTEX_LOCK();
        auto general_data = SmartCamera::CreateGeneralObject(*builder, ssdData->v_classes[i], SmartCamera::BoundingBox_BoundingBox2d, bbox_data.Union(), ssdData->v_scores[i], ssdData->iou[i], ssdData->zoneflag[i]);
        MUTEX_UNLOCK();
        
        MUTEX_LOCK();
        gdata_vector.push_back(general_data);
        MUTEX_UNLOCK();
    }
    MUTEX_LOCK();
    auto v_bbox = builder->CreateVector(gdata_vector);
    MUTEX_UNLOCK();

    MUTEX_LOCK();
    auto od_data = SmartCamera::CreateObjectDetectionData(*builder, v_bbox);
    MUTEX_UNLOCK();

    MUTEX_LOCK();
    auto out_data = SmartCamera::CreateObjectDetectionTop(*builder, od_data);
    MUTEX_UNLOCK();

    MUTEX_LOCK();
    builder->Finish(out_data);
    MUTEX_UNLOCK();
    
    return;
}
