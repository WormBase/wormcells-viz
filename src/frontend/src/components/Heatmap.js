import React, { useState, useEffect } from "react";
import D3Heatmap from "@wormbase/d3-heatmap";
import axios from 'axios';
import {Col, Row, Container, FormGroup, FormLabel, FormControl, Button} from "react-bootstrap";

const Heatmap = () => {

    const [genes, setGenes] = useState([]);
    const [cells, setCells] = useState([]);

    useEffect(() => {
        drawHeatmap();
    }, []);

    const drawHeatmap = () => {
        const d3heatmap = new D3Heatmap('#heatmap-div', "Differential Expression Heatmap", "", 80, 25, 150, 180, 700, 700);
        let apiEndpoint = process.env.REACT_APP_API_ENDPOINT_READ_DATA;
        axios
            .post(apiEndpoint, {gene_ids: genes, cell_names: cells})
            .then(res => {
                let threeColsData = [];
                Object.entries(res.data.response).forEach(([gene_id, values]) => {
                    Object.entries(values).forEach(([cell_name, value]) => {
                        threeColsData.push({group: gene_id, variable: cell_name, value: -Math.log10(value)});
                    })
                });
                let valuesSorted = threeColsData.map(e => e.value).sort((a, b) => a - b);
                let max = valuesSorted[valuesSorted.length - 1];
                let min = valuesSorted[0];
                threeColsData = threeColsData.map(e => {
                    return {
                        group: e.group,
                        variable: e.variable,
                        value: Math.round((e.value - min) / (max - min) * 100)
                    }
                })
                d3heatmap.draw(threeColsData);
            })
            .catch(err => {
                console.log("error");
            });
    }

    return (
        <div>
            <Container fluid>
                <Row>
                    <Col sm={7}>
                        <div id="heatmap-div" />
                    </Col>
                    <Col sm={5}>
                        <FormGroup controlId="exampleForm.ControlTextarea1">
                            <FormLabel>Genes</FormLabel>
                            <FormControl as="textarea" rows={6}
                                         value={genes.join('\n')}
                                         onChange={(event) => setGenes(event.target.value.split('\n'))}/>
                        </FormGroup>
                        <FormGroup controlId="exampleForm.ControlTextarea1">
                            <FormLabel>Cells</FormLabel>
                            <FormControl as="textarea" rows={6}
                                         value={cells.join('\n')}
                                         onChange={(event) => setCells(event.target.value.split('\n'))}/>
                        </FormGroup>
                        <Button onClick={() => drawHeatmap()}>Update</Button>
                    </Col>
                </Row>
            </Container>
        </div>

    );
}

export default Heatmap;