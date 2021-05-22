import React, {useState} from "react";
import PropTypes from "prop-types";
import {Button, Col, Container, Form, FormControl, Row} from "react-bootstrap";
import EntitiesFetchAndSelect from "./EntitiesFetchAndSelect";


const AutoComplete = ({close, addItemFunction, searchType, itemsNameSingular}) => {
    const [exactMatchOnly, setExactMatchOnly] = useState(false);
    const [searchString, setSearchString] = useState('');

    return (
        <Container fluid>
            <Row>
                <Col xs="auto">
                    <label>Add from Wormbase</label>
                </Col>
                <Col xs="auto">
                    <Button size="sm" variant="outline-primary" onClick={close}>Close</Button>
                </Col>
            </Row>
            <Row><Col>&nbsp;</Col></Row>
            <Row>
                <Col>
                    <FormControl as="textarea" rows="2" size="sm"
                                 placeholder={"Autocomplete 1+ name or ID"}
                                 onChange={(e) => {setSearchString(e.target.value)}}
                    />
                </Col>
            </Row>
            <Row>
                <Col>
                    <div className="d-flex justify-content-end">
                        <Form.Check type="checkbox"
                                    checked={exactMatchOnly}
                                    onClick={() => setExactMatchOnly(exactMatchOnly => !exactMatchOnly)}
                                    label="exact match only"
                        />
                    </div>
                </Col>
            </Row>
            <Row>
                <Col>
                    <EntitiesFetchAndSelect searchString={searchString} exactMatchOnly={exactMatchOnly}
                                            addItemFunction={addItemFunction} searchType={searchType} />
                </Col>
            </Row>
        </Container>
    );
}

AutoComplete.propTypes = {
    close: PropTypes.func,
    addItemFunction: PropTypes.func,
    searchType: PropTypes.string,
    itemsNameSingular: PropTypes.string
}

export default AutoComplete

