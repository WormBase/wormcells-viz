import React, {useState} from "react";
import PropTypes from "prop-types";
import {Button, Col, Container, Form, FormControl, Row, Spinner} from "react-bootstrap";
import EntitiesFetchAndSelect from "./EntitiesFetchAndSelect";
import {useQuery} from "react-query";
import axios from "axios";


const AutoComplete = ({close, addMultipleItemsFunction, searchType, itemsNameSingular}) => {
    const [exactMatchOnly, setExactMatchOnly] = useState(false);
    const [searchString, setSearchString] = useState('');

    const allGenes = useQuery('allGenes', async () => {
        let res = await axios.get(process.env.REACT_APP_API_ENDPOINT_READ_ALL_GENES);
        res.data = new Set(res.data);
        return res;
    });

    return (
        <Container fluid>
            <Row>
                <Col xs="auto">
                    <Form.Check type="checkbox"
                                checked={exactMatchOnly}
                                onClick={() => setExactMatchOnly(exactMatchOnly => !exactMatchOnly)}
                                label="exact match only"
                    />
                </Col>
                <Col xs="auto">
                    <div className="d-flex justify-content-end">
                        <Button size="sm" variant="outline-primary" onClick={close}>Close</Button>
                    </div>
                </Col>
            </Row>
            {allGenes.isLoading ? <Spinner animation="grow"/> :
                <>
                    <Row><Col>&nbsp;</Col></Row>
                    <Row>
                        <Col>
                            <FormControl as="textarea" rows="2" size="sm"
                                         placeholder={"Autocomplete 1+ name or ID. Only entities included in the dataset are shown."}
                                         onChange={(e) => {setSearchString(e.target.value)}}
                            />
                        </Col>
                    </Row>
                    <Row><Col>&nbsp;</Col></Row>
                    <Row>
                        <Col>
                            <EntitiesFetchAndSelect searchString={searchString} exactMatchOnly={exactMatchOnly}
                                                    addMultipleItemsFunction={addMultipleItemsFunction} searchType={searchType}
                                                    allGenes={allGenes.data.data} />
                        </Col>
                    </Row>
                </>}
        </Container>
    );
}

AutoComplete.propTypes = {
    close: PropTypes.func,
    addMultipleItemsFunction: PropTypes.func,
    searchType: PropTypes.string,
    itemsNameSingular: PropTypes.string
}

export default AutoComplete

