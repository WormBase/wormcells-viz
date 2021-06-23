import {useEffect, useState} from "react";
import React from "react";
import PropTypes from "prop-types";
import {
    Button,
    FormControl,
} from "react-bootstrap";
import {FiMinusCircle, FiSearch, FiUpload} from 'react-icons/fi';
import AutoComplete from "./AutoComplete";
import BulkIDUpload from "./BulkIDUpload";

const MultiSelect = (props) => {

    let selected = new Set(props.items);
    const [showAddFromWB, setAddFromWB] = useState(false);
    const [showUploadIDs, setUploadIDs] = useState(false);
    const [selectedItemsToDisplay, setSelectedItemsToDisplay] = useState(selected);
    const [selectedItemsAll, setSelectedItemsAll] = useState(selected);
    const [selectedItems, setSelectedItems] = useState([]);
    const [itemsIdForm, setItemsIdForm] = useState(undefined);
    const [tmpDeselectedItems, setTmpDeselectedItems] = useState(new Set());

    useEffect(() => {
        setSelectedItemsToDisplay(new Set(props.items));
        setSelectedItemsAll(new Set(props.items));

    }, [props.items]);

    const handleRemSelectedFromList = () => {
        if (itemsIdForm !== undefined) {
            let selOpts = [];
            let options = itemsIdForm;
            [...options].forEach(function(option){if (option.selected){ selOpts.push(option.value) }});
            if (selOpts.length !== [...tmpDeselectedItems].length) {
                [...options].forEach(function(option){ option.selected = false; });
            }
        }
        if (tmpDeselectedItems.size > 0) {
            [...tmpDeselectedItems].forEach((item) => {
               props.remItemFunction(item);
            });
        }
    }

    const handleChangeIdentifiedListSelection = (e) => {
        let selectedOptions = new Set();
        let selectedList = [];
        [...e.target].forEach(function(option){if (option.selected){
            selectedOptions.add(option.value);
            selectedList.push(option.value);
        }});
        setTmpDeselectedItems(selectedOptions);
        setItemsIdForm(e.target);
        setSelectedItems(selectedList);
    }

    const handleFilterIdChange = (e) => {
        setSelectedItemsToDisplay(new Set([...selectedItemsAll].filter(item => item.startsWith(e.target.value))));
    }

    return (
        <div className="container-fluid" style={{ paddingLeft: 0, paddingRight: 0 }}>
            <div className="row">
                <div className="col-sm-6">
                    <div className="container-fluid" style={{ paddingLeft: 0, paddingRight: 0 }}>
                        <div className="row">
                            <div className="col-sm-8">
                                <FormControl type="text" size="sm" onChange={handleFilterIdChange}
                                       placeholder={"Start typing to filter"}/>
                            </div>
                            <div className="col-sm-4">
                                <Button variant="outline-primary" className="pull-right" size="sm" onClick={() => {
                                    const element = document.createElement("a");
                                    const file = new Blob([[...selectedItemsToDisplay].sort().join("\n")],
                                        {type: 'text/plain'});
                                    element.href = URL.createObjectURL(file);
                                    element.download = props.itemsNamePlural + ".txt";
                                    document.body.appendChild(element); // Required for this to work in FireFox
                                    element.click();
                                }}>Export</Button>
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-sm-12">
                                &nbsp;
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-sm-12">
                                <FormControl as="select" multiple
                                             onChange={handleChangeIdentifiedListSelection}
                                             onKeyPress={(target) => {
                                                 if (target.charCode === 127) {
                                                     handleRemSelectedFromList();
                                                 }
                                             }}
                                             defaultValue=""
                                             style={{height: '350px'}}>
                                    {[...selectedItemsToDisplay].sort().map(item =>
                                        <option>{item}</option>
                                    )}
                                </FormControl>
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-sm-12">
                                &nbsp;
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-sm-auto">
                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={handleRemSelectedFromList}>
                                    <FiMinusCircle />
                                    &nbsp; Remove selected
                                </Button>
                            </div>
                            <div className="col-sm-auto">
                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => props.remAllItems()}>
                                    <FiMinusCircle />
                                    &nbsp; Remove all
                                </Button>
                            </div>
                            {props.linkWB && selectedItems.length > 0 ?
                                <>
                                <br/>
                                    <br/>
                                <Button size="sm" variant="link" onClick={() => {
                                            selectedItems.forEach((item) => {
                                                let itemNameIdArr = item.split(' ( ');
                                                if (itemNameIdArr.length > 1) {
                                                    window.open(props.linkWB + "/" + itemNameIdArr[1].slice(0, -2));
                                                }
                                            });
                                        }}>
                                            Show selected genes on WB
                                </Button></> : null}
                        </div>
                    </div>
                </div>
                <div className="col-sm-6">
                    <div className="container-fluid" style={{ paddingLeft: 0, paddingRight: 0 }}>
                        <div className="row">
                            <div className="col-sm-12">
                                {!showAddFromWB && !showUploadIDs
                                    ?
                                    <div>
                                        <br/><br/><br/><br/>
                                        <center><Button size="sm" variant="outline-primary" onClick={() => setAddFromWB(true)}>
                                            <FiSearch/>
                                            &nbsp; Search Genes
                                        </Button>
                                            <br/><br/>
                                            {!(props.hideListIDs !== undefined && props.hideListIDs === true) ?
                                                <Button variant="outline-primary" size="sm" onClick={() => setUploadIDs(true)}>
                                                    <FiUpload/>
                                                    &nbsp; Paste list of Gene IDs
                                                </Button>
                                                : ""}
                                        </center>
                                    </div>
                                    : ""}
                                {showAddFromWB ?
                                    <AutoComplete close={() => setAddFromWB(false)}
                                                  addMultipleItemsFunction={props.addMultipleItemsFunction}
                                                  searchType={props.searchType} />
                                    : ""}
                                {showUploadIDs ?
                                    <BulkIDUpload addMultipleItemsFunction={props.addMultipleItemsFunction}
                                                  close={() => setUploadIDs(false)}
                                                  searchType={props.searchType}
                                                  listIDsAPI={props.listIDsAPI}
                                    />
                                : ""}

                            </div>
                        </div>
                        <div className="row">
                            <div className="col-sm-12">

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

MultiSelect.propTypes = {
    items: PropTypes.array,
    addMultipleItemsFunction: PropTypes.func,
    remItemFunction: PropTypes.func,
    remAllItems: PropTypes.func,
    itemsNameSingular: PropTypes.string,
    itemsNamePlural: PropTypes.string,
    linkWB: PropTypes.string,
    hideListIDs: PropTypes.bool,
    dataReaderFunction: PropTypes.func,
    searchType: PropTypes.string,
    sampleQuery: PropTypes.string,
    listIDsAPI: PropTypes.string
}

export default MultiSelect;


