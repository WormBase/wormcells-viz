import React, {useState, useEffect, useRef} from "react";
import D3Heatmap from "@wormbase/d3-heatmap";
import axios from 'axios';
import {Col, Row, Container, FormGroup, FormLabel, FormControl, Button, Spinner} from "react-bootstrap";

const Heatmap = () => {

    const [genes, setGenes] = useState([]);
    const [cells, setCells] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const heatMapRef = useRef(null);
    const [heatMapSize, setHeatMapSize] = useState({top: 10, right: 25, bottom: 150, left: 100, width: 700,
        height: 700})

    useEffect(() => {
        drawHeatmap();
    }, [heatMapSize])

    useEffect(() => {
        let width = heatMapRef.current ? heatMapRef.current.offsetWidth : 0
        if (width !== heatMapSize.width) {
            setHeatMapSize(heatMapSize => ({...heatMapSize, width: width}));
        }
        const resizeListener = () => {
            let width = heatMapRef.current ? heatMapRef.current.offsetWidth : 0
            setHeatMapSize(heatMapSize => ({...heatMapSize, width: width}));
        };
        window.addEventListener('resize', resizeListener);
        return () => {
            window.removeEventListener('resize', resizeListener);
        }
    }, [])

    const drawHeatmap = async (top, right, bottom, left, width, height) => {
        setIsLoading(true);
        const d3heatmap = new D3Heatmap('#heatmap-div', heatMapSize.top, heatMapSize.right, heatMapSize.bottom,
            heatMapSize.left, heatMapSize.width, heatMapSize.height);
        let apiEndpoint = process.env.REACT_APP_API_ENDPOINT_READ_DATA;
        const res = await axios.post(apiEndpoint, {gene_ids: genes, cell_names: cells});
        let threeColsData = [];
        await Promise.all(Object.entries(res.data.response).map(async([gene_id, values]) => {
            let desc = await axios('http://rest.wormbase.org/rest/field/gene/' + gene_id + '/concise_description')
            Object.entries(values).forEach(([cell_name, value]) => {
                threeColsData.push({group: cell_name, variable: gene_id, value: -Math.log10(value),
                    tooltip_html: "Gene ID: <a href='https://wormbase.org/species/c_elegans/gene/'" + gene_id +
                        " target='_blank'>" + gene_id + "</a><br/>Cell Name: " + cell_name + "<br/>Gene description: " +
                        desc.data.concise_description.data.text + "<br/>" + "Value: " + value});
            })
        }));
        threeColsData = threeColsData.sort((a, b) => a.group + a.variable > b.group + b.variable ? 1 : -1)
        setGenes([...new Set(threeColsData.map(e => e.variable).reverse())]);
        setCells([...new Set(threeColsData.map(e => e.group))]);
        d3heatmap.draw(threeColsData);
        setIsLoading(false);
    }

    return (
        <div>
            <Container fluid>
                <Row>
                    <Col sm={7} center>
                        <h2 className="text-center">Gene Expression Heatmap</h2>
                    </Col>
                </Row>
                <Row>
                    <Col sm={7}>
                        <p className="text-center">{isLoading === true ? <Spinner animation="grow" /> : ''}</p>
                        <div id="heatmap-div" ref={heatMapRef}/>
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