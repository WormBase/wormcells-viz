import React, {useState} from "react";
import LoadingOverlay from 'react-loading-overlay';
import PropTypes from "prop-types";
import {useQueries, useQuery} from "react-query";
import axios from "axios";
import {AiFillWarning} from "react-icons/all";
import {Alert, Button, Form} from "react-bootstrap";
import {FiPlusCircle} from "react-icons/fi";


const EntitiesFetchAndSelect = ({searchString, exactMatchOnly, searchType, addItemFunction, allGenes}) => {

    const [tmpSelectedItems, setTmpSelectedItems] = useState(new Set());

    const searchEntities = searchString.split(/[\s,/\n]+/).map(e => e.trim()).filter(e => e !== "");

    const apiQueries = useQueries(searchEntities.map(entity => ({
        queryKey: ['apiQuery', entity],
        queryFn: () => {
            let url = process.env.REACT_APP_API_AUTOCOMPLETE_ENDPOINT + '&objectType=' + searchType + '&userValue=' + entity;
            return axios.get(url)
        }
    })));


    let availableItems = []
    let showMore = false;

    if (apiQueries.length > 0 && apiQueries.every(result => result.status === "success")) {
        let remAddInfo = searchType === "wbbt";
        let resultsMergedFirst = []
        let resultsMergedSecond = []
        let toMatch = new Set(searchEntities);
        let unorderedResults = apiQueries.map(res => res.data.data).join('\n').split('\n');
        unorderedResults.forEach(res => {
            if (res.split(' ( ').length > 1 && allGenes.has(res.split(' ( ')[1].split(' )')[0])) {
                if (toMatch.has(res.split(' ')[0])) {
                    resultsMergedFirst.push(res);
                } else if (!exactMatchOnly) {
                    resultsMergedSecond.push(res);
                }
            }
        });
        let resultsMerged = [...resultsMergedFirst, ...resultsMergedSecond].join('\n');
        const addInfoRegex = / \( ([^ ]+) \)[ ]+$/;
        if (resultsMerged !== undefined && resultsMerged !== "\n") {
            let newAvailItems = new Set(resultsMerged.split("\n").filter((item) => item !== ''));
            if (remAddInfo) {
                newAvailItems = new Set([...newAvailItems].map((elem) => elem.replace(addInfoRegex, "")));
            }
            if (newAvailItems.has("more ...")) {
                newAvailItems.delete("more ...");
                showMore = true;
            } else {
                showMore = false;
            }
            availableItems = newAvailItems;
        } else {
            availableItems = new Set();
            showMore = false;
        }
    }

    const addMultipleItems = () => {
        if (tmpSelectedItems.size > 0) {
            [...tmpSelectedItems].forEach((item) => {
               addItemFunction(item);
            });
        }
    }

    return (
        <div className="container-fluid" style={{paddingLeft: 0, paddingRight: 0}}>
            <div className="row">
                <div className="col-sm-12">
                    <LoadingOverlay
                        active={apiQueries.some(query => query.isLoading)}
                        spinner
                        text='Loading ...'
                    >
                        {apiQueries.some(query => query.error) ? <Alert bsStyle="danger">
                            <AiFillWarning/> <strong>Error</strong><br/>
                            Can't download WormBase data. Try again later or contact <a href="mailto:help@wormbase.org">
                            Wormbase Helpdesk</a>.
                        </Alert> : null}
                        <Form.Control as="select" multiple
                                      style={{height: '123px'}}
                                      defaultValue=""
                                      onChange={(e) => setTmpSelectedItems(new Set([...e.target].filter(option => option.selected).map(option => option.value)))}
                                      onDoubleClick={addMultipleItems}>
                            {[...availableItems].map(item =>
                                <option>{item}</option>)}
                        </Form.Control>
                    </LoadingOverlay>
                </div>
            </div>
            <div className="row">
                <div className="col-sm-12">
                    &nbsp;
                </div>
            </div>
            <div className="row">
                <div className="col-sm-12">
                    <Button variant="outline-primary" size="sm" onClick={() => {
                        addMultipleItems();
                        setTmpSelectedItems(new Set());
                    }}><FiPlusCircle/>
                        &nbsp; Add selected</Button>
                </div>
            </div>
            <div className="row">
                <div className="col-sm-12">
                    &nbsp;
                </div>
            </div>
            {showMore ? <div className="row">
                <div className="col-sm-12">
                    Some results matching the query have been omitted. Try a different query to narrow down the results.
                </div>
            </div> : null}
        </div>
    )
}

EntitiesFetchAndSelect.propTypes = {
    searchString: PropTypes.string,
    exactMatchOnly: PropTypes.bool,
    searchType: PropTypes.string,
    addItemFunction: PropTypes.func
}


export default EntitiesFetchAndSelect;