import React from "react";
import {Button, Form, FormControl, FormGroup, OverlayTrigger, Tooltip} from "react-bootstrap";
import axios from "axios";
import PropTypes from "prop-types";
import {useState} from "react";
import {FiPlusCircle} from "react-icons/fi";
import {AiFillQuestionCircle} from "react-icons/all";

const BulkIDUpload = ({addMultipleItemsFunction, close, listIDsAPI, searchType, itemsNamePlural}) => {

    const [uploadedIDs, setUploadedIDs] = useState("");

    return (
        <div>
            <FormGroup controlId="formControlsTextarea">
                <Form.Label>Insert a list of WB {itemsNamePlural} IDs</Form.Label> &nbsp; <Button size="sm" variant="outline-primary" className="pull-right" onClick={close}>Close</Button>
                <br/><br/>
                <FormControl as="textarea" rows={14} placeholder="each ID must start with 'WB'"
                             onChange={(e) => {
                                 setUploadedIDs(e.target.value);
                             }}/>
            </FormGroup>
            <Button size="sm" variant="outline-primary" onClick={async () => {
                if (uploadedIDs !== "") {
                    let entityIDs = uploadedIDs.split("\n");
                    if (entityIDs.length === 1) {
                        entityIDs = uploadedIDs.split(",");
                    }
                    let cleanData = [];
                    await Promise.all(entityIDs.map(async (geneId) => {
                        let data = await axios.get(listIDsAPI + "/" + geneId.trim());
                        if (data.data) {
                            cleanData.push(data.data + " ( " + geneId + " )");
                        }
                    }));
                    addMultipleItemsFunction(cleanData);
                }
            }}><FiPlusCircle/>&nbsp; Add</Button> &nbsp;&nbsp;{searchType === "gene" ? <a href="https://wormbase.org/tools/mine/gene_sanitizer.cgi" target="_blank" className="pull-right">WB gene name sanitizer <OverlayTrigger placement="top" overlay={
                <Tooltip>Screen a list of <i>C. elegans</i> gene names and identifiers to find whether they were renamed, merged, split, or share sequence with another gene</Tooltip>}>
                            <AiFillQuestionCircle/></OverlayTrigger></a> : ''}
        </div>
    );
}

BulkIDUpload.propTypes = {
    close: PropTypes.func,
    listIDsAPI: PropTypes.string,
    itemsNamePlural: PropTypes.string
}

export default BulkIDUpload;