/****************************************************************************
 * Copyright 2022 Sony Semiconductor Solutions Corp. All rights reserved.
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
#include <cmath>
#include <iostream>
#include <algorithm>
#include "ppl_public.h"
#include "custom_generated.h"
#include "parson.h"

#include <map> // [SARD] included
/* -------------------------------------------------------- */
/* define                                                   */
/* -------------------------------------------------------- */
#define PPL_ID_VERSION "00.01.00.00" //Format: "AA.XX.YY.ZZ" where AA:ID, XX.YY.ZZ : Version

#define PPL_CUSTOM_INPUT_TENSOR_WIDTH    (300)
#define PPL_CUSTOM_INPUT_TENSOR_HEIGHT   (300)
#define PPL_DEFAULT_MODE                 (false)    // 
#define PPL_DNN_OUTPUT_DETECTIONS        (10)     // Derived from DNN Model
#define PPL_DEFAULT_THRESHOLD            (0.3)    // Default value
#define PPL_DNN_OUTPUT_TENSOR_SIZE(dnnOutputDetections)  ((dnnOutputDetections * 4) + dnnOutputDetections + dnnOutputDetections + 1)    // bbox(dnnOutputDetections*4)+class(dnnOutputDetections)+scores(dnnOutputDetections)+numOfDetections(1) 
#define MAX(x,y)    (x > y ? x : y)
#define MIN(x,y)    (x < y ? x : y) 

/* -------------------------------------------------------- */
/* macro define                                             */
/* -------------------------------------------------------- */
#define PPL_ERR_PRINTF(fmt, ...) printf(fmt, ##__VA_ARGS__);printf("\n")
#define PPL_WARN_PRINTF(fmt, ...) printf(fmt, ##__VA_ARGS__);printf("\n")
#define PPL_INFO_PRINTF(fmt, ...) printf(fmt, ##__VA_ARGS__);printf("\n")
#define PPL_DBG_PRINTF(fmt, ...) printf(fmt, ##__VA_ARGS__);printf("\n")
#define PPL_VER_PRINTF(fmt, ...) printf(fmt, ##__VA_ARGS__);printf("\n")

/* -------------------------------------------------------- */
/* structure                                                */
/* -------------------------------------------------------- */
typedef enum tagEPPL_STATUS {
    PPL_INIT = 0,
    PPL_IDLE,
    PPL_DONE
} EPPL_STATUS;

typedef struct tagPPL_Zone{
    uint16_t top_left_x;
    uint16_t top_left_y;
    uint16_t bottom_right_x;
    uint16_t bottom_right_y;
} PPL_Zone;

typedef struct tagPPL_CustomParam{
    uint16_t dnnOutputDetections;
    uint16_t maxDetections;
    uint16_t mode;
    PPL_Zone Zone;
    float iou;
    float score;
    uint16_t inputWidth;
    uint16_t inputHeight;
} PPL_CustomParam;

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

typedef struct tagAnalyseIouData {
    uint8_t numOfDetections = 0;
    std::vector<PPL_Bbox> v_bbox;
    std::vector<float> v_scores;
    std::vector<uint8_t> v_classes;
    std::vector<float> iou;
    std::vector<uint8_t> zoneflag;
} AnalyseIouData;

/* -------------------------------------------------------- */
/* static                                                   */
/* -------------------------------------------------------- */
static const char* s_ppl_id_version = PPL_ID_VERSION; //Format: "AA.XX.YY.ZZ" where AA:ID, XX.YY.ZZ : Version
static EPPL_STATUS ppl_status = PPL_INIT;

static PPL_CustomParam s_custom_param = {0};//{PPL_DNN_OUTPUT_DETECTIONS,PPL_DNN_OUTPUT_DETECTIONS,PPL_DEFAULT_MODE,0,0.3,0.3,PPL_CUSTOM_INPUT_TENSOR_WIDTH,PPL_CUSTOM_INPUT_TENSOR_HEIGHT}; //Set Max detections=10 Default Threshold= 0.3

static EPPL_RESULT_CODE json_parse(JSON_Value *root_value);
static EPPL_RESULT_CODE PPL_CustomParamInit(JSON_Value *root_value);
static EPPL_RESULT_CODE PPL_ObjectDetectionSsdAnalyze(float *p_data, uint32_t in_size, void **pp_out_buf,  uint32_t *p_out_size, bool *p_upload_flag);
static EPPL_RESULT_CODE PPL_ObjectDetectionSsd_ResultRelease(uint8_t *p_result);
static int createObjectDetectionSsdData(float *data_body, uint32_t detect_num, ObjectDetectionSsdOutputTensor *objectdetection_output);
static void analyseObjectDetectionSsdOutput(ObjectDetectionSsdOutputTensor out_tensor, ObjectDetectionSsdData *output_objectdetection_data);
static void createCustomOutputFlatbuffer(flatbuffers::FlatBufferBuilder* builder, const AnalyseIouData *ssdData);
static EPPL_RESULT_CODE PPL_Custom_Analyse(ObjectDetectionSsdData *data, AnalyseIouData *output_analyse_data);

/* -------------------------------------------------------- */
/* Function Declaration                                     */
/* -------------------------------------------------------- */

/* -------------------------------------------------------- */
/* public function                                          */
/* -------------------------------------------------------- */
EPPL_RESULT_CODE PPL_Initialize(uint32_t network_id, const char *p_param) {
    PPL_DBG_PRINTF("PPL_Initialize network_id = 0x%x",network_id);

    EPPL_RESULT_CODE ret;

   /* Check status */
    if (ppl_status != PPL_INIT) {
        PPL_ERR_PRINTF("PPL:Invalid state : current state=0x%02X", ppl_status);
        return E_PPL_INVALID_STATE;
    }

    if(p_param == NULL) {
        PPL_ERR_PRINTF("PPL:Invalid param : param=NULL");
        return E_PPL_INVALID_PARAM;
    }

    /* network id not used */
    (void)network_id;

    if (strcmp(p_param, "") == 0) {
        PPL_INFO_PRINTF("PPL Initialize: PPL parameter is empty. Using default values:");
        PPL_INFO_PRINTF("dnn_output_detections: %d max_detections: %d mode: %d input_width: %d input_height: %d", \
        s_custom_param.dnnOutputDetections, s_custom_param.maxDetections, s_custom_param.mode, s_custom_param.inputWidth, s_custom_param.inputHeight);
    } else {
        //parse the json parameter
        JSON_Value *root_value;
        root_value = json_parse_string(p_param);
        if(json_value_get_type(root_value) != JSONObject) {
            json_value_free(root_value);
            return E_PPL_INVALID_PARAM;
        }

        ret = json_parse(root_value);
        if(ret != E_PPL_OK){
            PPL_ERR_PRINTF("PPL Initialize: Get json_parse Fail Err[%d]", ret);
            json_value_free(root_value);
            return ret;
        }
        json_value_free(root_value);

    }

    ppl_status = PPL_IDLE;
    return E_PPL_OK;
}

EPPL_RESULT_CODE PPL_Analyze(float *p_data, uint32_t in_size, void **pp_out_buf, uint32_t *p_out_size, bool *p_upload_flag) {
    PPL_DBG_PRINTF("PPL_Analyze");

    EPPL_RESULT_CODE ret;

    /* check status */
    if (ppl_status != PPL_IDLE) {
        PPL_ERR_PRINTF("PPL:Invalid state : current state=0x%02X", ppl_status);
        return E_PPL_INVALID_STATE;
    }

    /* check param */
    if (p_data == NULL) {
        PPL_ERR_PRINTF("PPL:Invalid param : pdata=NULL");
        return E_PPL_INVALID_PARAM;
    }
    if (pp_out_buf == NULL) {
        PPL_ERR_PRINTF("PPL:Invalid param : param=NULL");
        return E_PPL_INVALID_PARAM;
    }
    if (p_out_size == NULL) {
        PPL_ERR_PRINTF("PPL:Invalid param : size=NULL");
        return E_PPL_INVALID_PARAM;
    }
    if (p_upload_flag == NULL) {
        PPL_ERR_PRINTF("PPL:Invalid param : uploadFlag=NULL");
        return E_PPL_INVALID_PARAM;
    }

    /* call analyze function */
    ret = PPL_ObjectDetectionSsdAnalyze(p_data, in_size, pp_out_buf, p_out_size, p_upload_flag);

    ppl_status = PPL_DONE;
    return ret;
}

EPPL_RESULT_CODE PPL_ResultRelease(void *p_result) {
    PPL_DBG_PRINTF("PPL_ResultRelease");

    EPPL_RESULT_CODE ret;

    /* check status */
    if (ppl_status != PPL_DONE) {
        PPL_ERR_PRINTF("PPL:Invalid state : current state=0x%02X", ppl_status);
        return E_PPL_INVALID_STATE;
    }

    /* check param */
    if (p_result == NULL) {
        PPL_ERR_PRINTF("PPL:Invalid param, result=NULL");
        return E_PPL_INVALID_PARAM;
    }

    /* call function */
    ret = PPL_ObjectDetectionSsd_ResultRelease((uint8_t *)p_result);
    ppl_status = PPL_IDLE;
    return ret;
}

EPPL_RESULT_CODE PPL_Finalize() {
    PPL_DBG_PRINTF("PPL_Finalize");

    /* check status */
    if (ppl_status == PPL_DONE) {
        PPL_ERR_PRINTF("PPL:Invalid state : current state=0x%02X", ppl_status);
        return E_PPL_INVALID_STATE;
    }

    ppl_status = PPL_INIT;
    return E_PPL_OK;
}

const char* PPL_GetPplVersion() {
    PPL_DBG_PRINTF("PPL_GetPplVersion");

    return PPL_ID_VERSION;
}

/* -------------------------------------------------------- */
/* private function                                         */
/* -------------------------------------------------------- */
static EPPL_RESULT_CODE PPL_CustomParamInit(JSON_Value *root_value) {
    PPL_INFO_PRINTF("[SARD][ROI ANALYSE] PPL_CustomParamInit ");
    if (json_object_has_value(json_object(root_value),"dnn_output_detections")) {
        uint16_t dnn_output_detections = json_object_get_number(json_object(root_value), "dnn_output_detections");
        PPL_DBG_PRINTF("[SARD][ROI ANALYSE] PPL_CustomParamInit dnn_output_detections: %d", dnn_output_detections);
        s_custom_param.dnnOutputDetections = dnn_output_detections;
    } else {
        PPL_ERR_PRINTF("[SARD][ROI ANALYSE] PPL_CustomParamInit: json file does not have parameter \"dnn_output_detections\"");
        return E_PPL_INVALID_PARAM;
    }

    if (json_object_has_value(json_object(root_value),"max_detections")) {
        uint16_t maxDetections = (int)json_object_get_number(json_object(root_value), "max_detections");
        PPL_DBG_PRINTF("[SARD][ROI ANALYSE] PPL_CustomParamInit max_detections: %d", maxDetections);
        if (maxDetections > s_custom_param.dnnOutputDetections) {
            PPL_WARN_PRINTF("[SARD][ROI ANALYSE] max_detections > max number of classes, set to max number of classes");
            s_custom_param.maxDetections = s_custom_param.dnnOutputDetections;
        } else {
            s_custom_param.maxDetections = maxDetections;
        }
    } else {
        PPL_ERR_PRINTF("[SARD][ROI ANALYSE] PPL_CustomParamInit: json file does not have max_detections");
        return E_PPL_INVALID_PARAM;
    }

    if (json_object_has_value(json_object(root_value),"mode")){
        uint16_t mode = (int)json_object_get_number(json_object(root_value), "mode");
        PPL_DBG_PRINTF("[SARD][ROI ANALYSE] PPL_CustomParamInit Mode: %d", mode);
        s_custom_param.mode = mode;
        PPL_DBG_PRINTF("[SARD][ROI ANALYSE] PPL_CustomParamInit s_custom_param.mode: %d", s_custom_param.mode);
    } else {
        PPL_ERR_PRINTF("[SARD][ROI ANALYSE] PPL_CustomParamInit: json file does not have mode");
        return E_PPL_INVALID_PARAM;        
    }
    
    if (json_object_has_value(json_object(root_value),"zone")){
        if (json_object_has_value_of_type(json_object(root_value),"zone",JSONObject)) {  
			JSON_Object *zone = json_object_get_object(json_object(root_value), "zone");		
			if (json_object_has_value(zone,"top_left_x")) {
			s_custom_param.Zone.top_left_x = (int)json_object_get_number(zone, "top_left_x");
			PPL_DBG_PRINTF("[SARD][ROI ANALYSE] PPL_CustomParamInit top_left_x: %d", s_custom_param.Zone.top_left_x);
            }else {
                PPL_ERR_PRINTF("[SARD][ROI ANALYSE] PPL_CustomParamInit: json file does not have top_left_x");
                return E_PPL_INVALID_PARAM;             
            }
            if (json_object_has_value(zone,"top_left_y")) {
			s_custom_param.Zone.top_left_y = (int)json_object_get_number(zone, "top_left_y");
			PPL_DBG_PRINTF("[SARD][ROI ANALYSE] PPL_CustomParamInit top_left_y: %d", s_custom_param.Zone.top_left_y);
            }else {
                PPL_ERR_PRINTF("[SARD][ROI ANALYSE] PPL_CustomParamInit: json file does not have top_left_y");
                return E_PPL_INVALID_PARAM;             
            }
            if (json_object_has_value(zone,"bottom_right_x")) {
			s_custom_param.Zone.bottom_right_x = (int)json_object_get_number(zone, "bottom_right_x");
			PPL_DBG_PRINTF("[SARD][ROI ANALYSE] PPL_CustomParamInit bottom_right_x: %d", s_custom_param.Zone.bottom_right_x);
            }else {
                PPL_ERR_PRINTF("[SARD][ROI ANALYSE] PPL_CustomParamInit: json file does not have bottom_right_x");
                return E_PPL_INVALID_PARAM;             
            }
            if (json_object_has_value(zone,"bottom_right_y")) {
			s_custom_param.Zone.bottom_right_y = (int)json_object_get_number(zone, "bottom_right_y");
			PPL_DBG_PRINTF("[SARD][ROI ANALYSE] PPL_CustomParamInit bottom_right_y: %d", s_custom_param.Zone.bottom_right_y);
            }else {
                PPL_ERR_PRINTF("[SARD][ROI ANALYSE] PPL_CustomParamInit: json file does not have bottom_right_y");
                return E_PPL_INVALID_PARAM;             
            }
        } 
    }else {
        PPL_ERR_PRINTF("[SARD][ROI ANALYSE] PPL_CustomParamInit: json file does not have zone");
        return E_PPL_INVALID_PARAM;         
    }

    if (json_object_has_value(json_object(root_value),"threshold")){
        if (json_object_has_value_of_type(json_object(root_value),"threshold",JSONObject)) {  
			JSON_Object *threshold = json_object_get_object(json_object(root_value), "threshold");		
			if (json_object_has_value(threshold,"iou")) {
			s_custom_param.iou = (float)json_object_get_number(threshold, "iou");
			PPL_DBG_PRINTF("[SARD][ROI ANALYSE] PPL_CustomParamInit iou: %f", s_custom_param.iou);
            }
            else {
                PPL_ERR_PRINTF("[SARD][ROI ANALYSE] PPL_CustomParamInit: json file does not have iou");
                return E_PPL_INVALID_PARAM;             
            }
            if (json_object_has_value(threshold,"score")) {
			s_custom_param.score = (float)json_object_get_number(threshold, "score");
			PPL_DBG_PRINTF("[SARD][ROI ANALYSE] PPL_CustomParamInit score: %f", s_custom_param.score);
            }
            else {
                PPL_ERR_PRINTF("[SARD][ROI ANALYSE] PPL_CustomParamInit: json file does not have score");
                return E_PPL_INVALID_PARAM;             
            }
        }
    }else
    {
        PPL_ERR_PRINTF("[SARD][ROI ANALYSE] PPL_CustomParamInit: json file does not have threshold");
        return E_PPL_INVALID_PARAM;         
    }

    if (json_object_has_value(json_object(root_value),"input_width")) {
        uint16_t input_width = json_object_get_number(json_object(root_value), "input_width");
        PPL_DBG_PRINTF("[SARD][ROI ANALYSE] PPL_CustomParamInit input_width: %d", input_width);
        s_custom_param.inputWidth = input_width;
    } else {
        PPL_ERR_PRINTF("[SARD][ROI ANALYSE] PPL_CustomParamInit: json file does not have input_width");
        return E_PPL_INVALID_PARAM;
    }

    if (json_object_has_value(json_object(root_value),"input_height")) {
        uint16_t input_height = json_object_get_number(json_object(root_value), "input_height");
        PPL_DBG_PRINTF("[SARD][ROI ANALYSE] PPL_CustomParamInit input_height: %d", input_height);
        s_custom_param.inputHeight = input_height;
    } else {
        PPL_ERR_PRINTF("[SARD][ROI ANALYSE] PPL_CustomParamInit: json file does not have \"input_height\"");
        return E_PPL_INVALID_PARAM;
    }
    
    return E_PPL_OK;
}

/**
 * json_parse: get json data from json_object and update in local struct
 * 
 * @param param Pointer to json string containing PPL specific parameters
 * @return Success or failure EPPL_RESULT_CODE
 */
static EPPL_RESULT_CODE json_parse(JSON_Value *root_value) {
    const char *p = NULL;

    PPL_INFO_PRINTF("PPL_Initialize: <json_parse>");

    if (json_object_has_value(json_object(root_value),"header")) {
        if (json_object_has_value_of_type(json_object(root_value),"header",JSONObject)) {
            JSON_Object *header = json_object_get_object(json_object(root_value), "header");
            if (json_object_has_value(header,"id")) {
                p = json_object_get_string(header, "id");
                if (p != NULL) { 
                    if (strncmp(s_ppl_id_version, p, 2)== 0) {
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

            if (json_object_has_value(header,"version")) {
                p = json_object_get_string(header, "version");
                if (p != NULL) {
                    if (strncmp(&s_ppl_id_version[3], p, 8) == 0) {
                        PPL_DBG_PRINTF("[PPL_PUBLIC] header_version p = %s ppl_id_version=%s",p,&s_ppl_id_version[3]);
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
    return PPL_CustomParamInit(root_value);
}

int diff_magnitude(int a, int b)
{
    return (MAX(a,b) - MIN(a,b));
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
uint16_t object_inside_zone(std::vector<PPL_Bbox>& out_box, int i, float *out_iou/*std::vector<float>& out_iou*/)
{
    int x5 = MAX(s_custom_param.Zone.top_left_x, out_box[i].m_xmin);
    int y5 = MAX(s_custom_param.Zone.top_left_y, out_box[i].m_ymin);
    int x6 = MIN(s_custom_param.Zone.bottom_right_x, out_box[i].m_xmax);
    int y6 = MIN(s_custom_param.Zone.bottom_right_y, out_box[i].m_ymax);
    float overlap_area = 0, object_area = 0;

    if((x5 > x6) || (y5 > y6))
    {
        PPL_DBG_PRINTF("[SARD][ROI ANALYSE]: object is outside zone");
        return 0;
    }
    overlap_area = (diff_magnitude(x5 ,x6))*(diff_magnitude(y5 , y6));
    object_area = (diff_magnitude(out_box[i].m_xmin, out_box[i].m_xmax))*(diff_magnitude(out_box[i].m_ymax , out_box[i].m_ymin));
    
    *(out_iou + i) = overlap_area/object_area; // x% of object in Zone area float value
    
    return 1;
}

/**
 * @brief PPL_Custom_Analyse
 * Calculate the IoU of the detected Objects and update the Flag and IoU Output data. 
 * 
 * @param data DNN parsed data(without filter) 
 * @param output_analyse_data IoU analysed output data
 * which is updated based on threshold for each class.
 * @return Success 
 */
static EPPL_RESULT_CODE PPL_Custom_Analyse(ObjectDetectionSsdData *data, AnalyseIouData *output_analyse_data) {
    uint8_t num_of_detections = 0;
    uint16_t ret = 0;
    std::vector<PPL_Bbox> out_box;
    std::vector<float> out_scores;
    std::vector<uint8_t> out_classes;
    uint8_t zoneflag[PPL_DNN_OUTPUT_DETECTIONS] = {0};
    float iou[PPL_DNN_OUTPUT_DETECTIONS] = {0};

    PPL_INFO_PRINTF("[SARD][ROI ANALYSE]: PPL_Custom_Analyse");
    if (data == NULL) // sanity check
    {
        PPL_ERR_PRINTF("[SARD][ROI ANALYSE] Invalid param : data=NULL");
        return E_PPL_INVALID_PARAM;
    }

    num_of_detections = data->numOfDetections;
    /* check param */
    if (num_of_detections > PPL_DNN_OUTPUT_DETECTIONS) {
        PPL_WARN_PRINTF("[SARD][ROI ANALYSE]: m_maxdetect > PPL_DNN_OUTPUT_DETECTIONS, Set to Max DNN_OUTPUT_DETECTIONS");
        num_of_detections = PPL_DNN_OUTPUT_DETECTIONS;
    }

    out_box = data->v_bbox;
    out_classes = data->v_classes;
    out_scores = data->v_scores;

    PPL_INFO_PRINTF("[SARD][ROI ANALYSE]: start filter");
    for (uint32_t i = 0; i < num_of_detections; i++)
    {
        if(s_custom_param.mode == 1)
        {        
            ret = object_inside_zone(out_box,i,iou);
            if(ret == 1)
            {
                if(iou[i] < s_custom_param.iou)
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
            ret = object_inside_zone(out_box,i,iou);
            if(ret == 1)
            {
                if(iou[i] < s_custom_param.iou)
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

    if(s_custom_param.mode == 1)
    {
        uint32_t counter = 0;
        for (uint32_t i = 0; i < num_of_detections; i++)
        {
            if(zoneflag[i])
            {   
                output_analyse_data->iou.push_back(iou[i]);
                output_analyse_data->v_bbox.push_back(out_box[i]);
                output_analyse_data->v_classes.push_back(out_classes[i]);
                output_analyse_data->v_scores.push_back(out_scores[i]);
                output_analyse_data->zoneflag.push_back(zoneflag[i]);
                counter++;
            }
        }
        output_analyse_data->numOfDetections = counter;        
    }
    else
    {
        for (uint32_t i = 0; i < num_of_detections; i++)
        {
            output_analyse_data->iou.push_back(iou[i]);
            output_analyse_data->v_bbox.push_back(out_box[i]);
            output_analyse_data->v_classes.push_back(out_classes[i]);
            output_analyse_data->v_scores.push_back(out_scores[i]);
            output_analyse_data->zoneflag.push_back(zoneflag[i]);
        }
        output_analyse_data->numOfDetections = num_of_detections;                
    }

    for(uint32_t i=0; i < output_analyse_data->numOfDetections; i++)
    {
        PPL_DBG_PRINTF("===========================================");
        PPL_DBG_PRINTF("[SARD][ROI ANALYSE]: Output Data [%d]: ",i);
        PPL_DBG_PRINTF("IoU: %f",output_analyse_data->iou[i]);
        PPL_DBG_PRINTF("Classes: %d",output_analyse_data->v_classes[i]);
        PPL_DBG_PRINTF("Score: %f",output_analyse_data->v_scores[i]);
        PPL_DBG_PRINTF("ZoneFlag: %s",output_analyse_data->zoneflag[i]?"Unsafe Zone":"Safe Zone");
        PPL_DBG_PRINTF("Bounding Box[%d] :[x_min,y_min,x_max,y_max] = [%d,%d,%d,%d]", 
        i,
        output_analyse_data->v_bbox[i].m_xmin,
        output_analyse_data->v_bbox[i].m_ymin,
        output_analyse_data->v_bbox[i].m_xmax,
        output_analyse_data->v_bbox[i].m_ymax);
        PPL_DBG_PRINTF("===========================================");
    }
    return E_PPL_OK;
}

/**
 * @brief PPL_ObjectDetectionSsdAnalyze
 */
static EPPL_RESULT_CODE PPL_ObjectDetectionSsdAnalyze(float *p_data, uint32_t in_size, void **pp_out_buf,  uint32_t *p_out_size, bool *p_upload_flag) {

    uint8_t *p_out_param = NULL;
    ObjectDetectionSsdOutputTensor objectdetection_output;
    ObjectDetectionSsdData output_objectdetection_data;
    AnalyseIouData output_analyse_data;

    PPL_DBG_PRINTF("PPL_ObjectDetectionSsdAnalyze");

    if (p_data == NULL) {
        PPL_ERR_PRINTF("PPL:Invalid param : pdata=NULL");
        return E_PPL_INVALID_PARAM;
    }

    if (in_size != (uint32_t)(PPL_DNN_OUTPUT_TENSOR_SIZE(s_custom_param.dnnOutputDetections))) {
        PPL_ERR_PRINTF("PPL:Unexpected value for : in_size %d",in_size);
        PPL_ERR_PRINTF("PPL:Expected value for : in_size %d",(uint32_t)(PPL_DNN_OUTPUT_TENSOR_SIZE(s_custom_param.dnnOutputDetections)));
        return E_PPL_INVALID_PARAM;
    }

    /* call interface process */
    int ret = createObjectDetectionSsdData(p_data,s_custom_param.dnnOutputDetections, &objectdetection_output);
    if (ret != 0) {
        PPL_ERR_PRINTF("PPL: Error in createObjectDetectionData");
        return E_PPL_OTHER;
    }

    /* call analize process */
    analyseObjectDetectionSsdOutput(objectdetection_output, &output_objectdetection_data);

//======================PPL_Custom_Analyse()==========================//
    PPL_Custom_Analyse(&output_objectdetection_data, &output_analyse_data);

    /* Serialize Data to FLatbuffers */ 
    flatbuffers::FlatBufferBuilder* builder = new flatbuffers::FlatBufferBuilder();
    createCustomOutputFlatbuffer(builder,&output_analyse_data);

    uint8_t* buf_ptr = builder->GetBufferPointer();
    if (buf_ptr == NULL) {
        PPL_ERR_PRINTF("Error could not create Flatbuffer");
        builder->Clear();
        delete(builder);
        return E_PPL_OTHER;
    }
    uint32_t buf_size = builder->GetSize();

    p_out_param = (uint8_t*)malloc(buf_size);
    if (p_out_param == NULL) {
        PPL_ERR_PRINTF("malloc failed for creating flatbuffer, malloc size=%d", buf_size);
        builder->Clear();
        delete(builder);
        return E_PPL_E_MEMORY_ERROR;
    }
    PPL_DBG_PRINTF("p_out_param = %p", p_out_param);

    /* Copy Data */
    memcpy(p_out_param, buf_ptr, buf_size);
    *pp_out_buf = p_out_param;
    *p_out_size = buf_size;

    //Clean up
    builder->Clear();
    delete(builder);

    /* Set upload_flag to true by default. May be customized in other PPL Implementation */
    *p_upload_flag = true;

    return E_PPL_OK;
}

/**
 * @brief PPL_ObjectDetectionSsd_ResultRelease
 */
static EPPL_RESULT_CODE PPL_ObjectDetectionSsd_ResultRelease(uint8_t *p_result) {
    PPL_DBG_PRINTF("PPL_ObjectDetectionSsd_ResultRelease");
    /* check param */
    if (p_result == NULL) {
        PPL_ERR_PRINTF("Invalid param : pdata=NULL");
        return E_PPL_INVALID_PARAM;
    }
    PPL_DBG_PRINTF("p_result = %p", p_result);

    free(p_result);
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
        v_bbox.push_back(bbox);
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
        v_classes.push_back(class_index);
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
        v_scores.push_back(score);
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
    objectdetection_output->bboxes = v_bbox;
    objectdetection_output->scores = v_scores;
    objectdetection_output->classes = v_classes;

    return 0;
}

/**
 * @brief analyseObjectDetectionSsdOutput
 */
static void analyseObjectDetectionSsdOutput(ObjectDetectionSsdOutputTensor out_tensor, ObjectDetectionSsdData *output_objectdetection_data) {
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
        score = out_tensor.scores[i];
        
        /* Filter Detections */
        if (score < s_custom_param.score) { // filter object based on object confidence score threshold 
            continue;
        } else {
            v_scores.push_back(score);

            /* Extract bounding box co-ordinates */
            PPL_Bbox bbox;
            bbox.m_xmin = (uint16_t)(round((out_tensor.bboxes[i].x_min) * (s_custom_param.inputWidth - 1)));
            bbox.m_ymin = (uint16_t)(round((out_tensor.bboxes[i].y_min) * (s_custom_param.inputHeight  - 1)));
            bbox.m_xmax = (uint16_t)(round((out_tensor.bboxes[i].x_max) * (s_custom_param.inputWidth  - 1)));
            bbox.m_ymax = (uint16_t)(round((out_tensor.bboxes[i].y_max) * (s_custom_param.inputHeight - 1)));
            v_bbox.push_back(bbox);

           /* Extract classes */
            uint8_t class_index;
            class_index = (uint8_t)out_tensor.classes[i];
            v_classes.push_back(class_index);

            detections_above_threshold++;
        }
    }

    objectdetection_data.numOfDetections = detections_above_threshold;
    objectdetection_data.v_bbox = v_bbox;
    objectdetection_data.v_scores = v_scores;
    objectdetection_data.v_classes = v_classes;
    //objectdetection_data = getActualDetections(objectdetection_data);

    if (objectdetection_data.numOfDetections > s_custom_param.maxDetections) {
        objectdetection_data.numOfDetections = s_custom_param.maxDetections;
        objectdetection_data.v_bbox.resize(s_custom_param.maxDetections);
        objectdetection_data.v_classes.resize(s_custom_param.maxDetections);
        objectdetection_data.v_scores.resize(s_custom_param.maxDetections);
    }

    output_objectdetection_data->numOfDetections = objectdetection_data.numOfDetections;
    output_objectdetection_data->v_bbox = objectdetection_data.v_bbox;
    output_objectdetection_data->v_scores = objectdetection_data.v_scores;
    output_objectdetection_data->v_classes = objectdetection_data.v_classes;

    PPL_DBG_PRINTF("number of detections = %d", objectdetection_data.numOfDetections);
    num_of_detections = objectdetection_data.numOfDetections;
    for (int i = 0; i < num_of_detections; i++) {
        PPL_DBG_PRINTF(
            "v_bbox[%d] :[x_min,y_min,x_max,y_max] = [%d,%d,%d,%d]",
            i,
            objectdetection_data.v_bbox[i].m_xmin,
            objectdetection_data.v_bbox[i].m_ymin,
            objectdetection_data.v_bbox[i].m_xmax,
            objectdetection_data.v_bbox[i].m_ymax
        );
    }
    for (int i = 0; i < num_of_detections; i++) {
        PPL_DBG_PRINTF("scores[%d] = %f", i, objectdetection_data.v_scores[i]);
    }
    for (int i = 0; i < num_of_detections; i++) {
        PPL_DBG_PRINTF("class_indices[%d] = %d", i, objectdetection_data.v_classes[i]);
    }

    return;
}

/* Function to serialize SSD MobilenetV1 output tensor data into Flatbuffers.
*/
static void createCustomOutputFlatbuffer(flatbuffers::FlatBufferBuilder* builder, const AnalyseIouData* ssdData) {
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
        auto bbox_data = SmartCamera::CreateBoundingBox2d(*builder, ssdData->v_bbox[i].m_xmin, \
            ssdData->v_bbox[i].m_ymin, \
            ssdData->v_bbox[i].m_xmax, \
            ssdData->v_bbox[i].m_ymax);
        PPL_DBG_PRINTF("[SARD][IoU_Analyse] createFlatbuffer : general_data");
        auto general_data = SmartCamera::CreateGeneralObject(*builder, ssdData->v_classes[i], SmartCamera::BoundingBox_BoundingBox2d, bbox_data.Union(), ssdData->v_scores[i], ssdData->iou[i], ssdData->zoneflag[i]);
        gdata_vector.push_back(general_data);
    }

    auto v_bbox = builder->CreateVector(gdata_vector);
    auto od_data = SmartCamera::CreateObjectDetectionData(*builder, v_bbox);
    auto out_data = SmartCamera::CreateObjectDetectionTop(*builder, od_data);

    builder->Finish(out_data);
    
    return;
}
