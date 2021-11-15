import React, {useState} from "react";
import PropTypes from "prop-types";
import {Button, Card, Col, Container, FormCheck, FormControl, Row} from "react-bootstrap";

const CellCheckboxSelector = ({cells, allCells, setCellsCallback}) => {
    const [showAllCells, setShowAllCells] = useState(true);
    const [filterCells, setFilterCells] = useState('');
    const cellsSet = new Set(cells);

    return (
        <div>
            <FormControl type="text" size="sm" placeholder="Start typing to filter"
                         onChange={(event) => setFilterCells(event.target.value)}/>
            <br/>
            <Card style={{height: "350px", overflowY: "scroll"}}>
                <Card.Body>
                    {allCells.data.filter(cell => showAllCells || cellsSet.has(cell))
                        .filter(cell => filterCells === '' || cell.toLowerCase().startsWith(filterCells.toLowerCase()))
                        .sort().map(cell =>
                            <FormCheck type="checkbox"
                                       label={cell}
                                       checked={cellsSet.has(cell)}
                                       onChange={(event) => {
                                           if (event.target.checked) {
                                               setCellsCallback(new Set([...cellsSet, cell]));
                                           } else {
                                               setCellsCallback(new Set([...cellsSet].filter(x => x !== cell)))
                                           }
                                       }}
                            />)}</Card.Body></Card>
            <br/>
            <Container fluid>
                <Row>
                    <Col>
                        <FormCheck type="checkbox"
                                   label="show selected only"
                                   checked={!showAllCells}
                                   onChange={(event) => setShowAllCells(!event.target.checked)}
                        />
                    </Col>
                    <Col>
                        <Button variant="outline-primary" size="sm"
                                onClick={() => setCellsCallback(new Set(allCells.data))}>
                            Select All</Button> <Button variant="outline-primary"
                                                        size="sm"
                                                        onClick={() => setCellsCallback(new Set())}>Deselect All</Button>
                    </Col>
                </Row>
            </Container>
        </div>
    );
}

CellCheckboxSelector.propTypes = {
    cells: PropTypes.arrayOf(PropTypes.string).isRequired,
    allCells: PropTypes.arrayOf(PropTypes.string).isRequired,
    setCellsCallback: PropTypes.func
}

export default CellCheckboxSelector;