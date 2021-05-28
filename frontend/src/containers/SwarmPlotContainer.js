import React, {useEffect, useRef, useState} from "react";
import {useQuery} from "react-query";
import {Swarmplot} from "@wormbase/d3-charts";
import axios from "axios";
import {
    Button,
    Card,
    Col,
    Container,
    FormCheck,
    FormControl,
    FormGroup,
    FormLabel,
    Row,
    Spinner
} from "react-bootstrap";
import {saveSvgAsPng} from "save-svg-as-png";
import {Typeahead} from "react-bootstrap-typeahead";
import _ from 'lodash';

const SwarmPlotContainer = () => {
    const [cell, setCell] = useState('');
    const [genes, setGenes] = useState(new Set());
    const [filterGenes, setFilterGenes] = useState('');
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const swarmRef = useRef(null);

    const [swarmplotSize, setSwarmplotSize] = useState({top: 50, right: 25, bottom: 30, left: 120, width: 1200,
        height: 650});

    const allCells = useQuery('allCells', () => axios.get(process.env.REACT_APP_API_ENDPOINT_READ_ALL_CELLS));

    useEffect(() => {
        fetchData(cell);
    }, [cell]);

    useEffect(() => {
        if (data !== null) {
            drawSwarmplot();
        }
    }, [data, swarmplotSize]);

    useEffect(() => {
        if (data != null) {
            updateSelectedGenes();
        }
    }, [genes])

    useEffect(() => {
        let width = swarmRef.current ? swarmRef.current.offsetWidth : 0
        if (width !== swarmplotSize.width) {
            setSwarmplotSize(swarmplotSize => ({...swarmplotSize, width: width}));
        }
        const resizeListener = () => {
            let width = swarmRef.current ? swarmRef.current.offsetWidth : 0
            setSwarmplotSize(swarmplotSize => ({...swarmplotSize, width: width}));
        };
        window.addEventListener('resize', resizeListener);
        return () => {
            window.removeEventListener('resize', resizeListener);
        }
    }, []);

    const fetchData = async (cell) => {
        setIsLoading(true);
        let apiEndpoint = process.env.REACT_APP_API_ENDPOINT_READ_DATA_SWARMPLOT;
        const res = await axios.post(apiEndpoint, {cell: cell});
        setCell(res.data.cell);
        let dataMod = [];
        await Promise.all(Object.entries(res.data.response).map(async([gene_id, [refVal, values]]) => {
            let gene_name = await axios('http://rest.wormbase.org/rest/field/gene/' + gene_id + '/name')
            gene_name = gene_name.data.name.data.label;
            values.forEach(([cell_name, rawVal, logfc]) => {
                dataMod.push(
                    {
                        x: logfc,
                        y: gene_name,
                        tooltip_html:
                            "<div><strong>Cell type</strong>: " + cell_name + "<br/>" +
                            "<strong>Gene</strong>: " + gene_name + "<br/>" +
                            "<strong>" + cell_name + " expression</strong>: 10<sup>-" + (-Math.log10(rawVal)).toFixed(1) + "</sup><br/>" +
                            "<strong>" + res.data.cell + " expression</strong>: 10<sup>-" + (-Math.log10(refVal)).toFixed(1) + "</sup><br/>" +
                            "<strong>log2 fold change</strong>: " + logfc.toFixed(1) + "</div>",
                        selected: genes.has(gene_name)
                    })
            });
        }));
        setData(dataMod);
        setIsLoading(false);
    }

    const drawSwarmplot = async () => {
        setIsLoading(true);
        const d3Swarmplot = new Swarmplot('#swarmplot-div', swarmplotSize.top, swarmplotSize.right, swarmplotSize.bottom,
            swarmplotSize.left, swarmplotSize.width, swarmplotSize.height, 20);
        d3Swarmplot.draw(data);
        setIsLoading(false);
    }

    const updateSelectedGenes = () => {
        let newData = _.cloneDeep(data);
        newData.forEach((d, index, origArray) => origArray[index].selected = genes.has(d.y));
        setData(newData);
    }

    return (
        <div>
            <Container fluid>
                <Row>
                    <Col sm={7}>
                        <Container fluid style={{paddingLeft: 0, paddingRight: 0}}>
                            <Row>
                                <Col sm={12} center>
                                    <h5 className="text-center">Relative Log-fold change in expression of top 25 specific genes for cell '{cell}'</h5>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <p className="text-center">{isLoading === true ? <Spinner animation="grow" /> : ''}</p>
                                    <div id="swarmplot-div" ref={swarmRef}/>
                                </Col>
                            </Row>
                        </Container>
                    </Col>
                    <Col sm={5}>
                        <Container fluid style={{paddingLeft: 0, paddingRight: 0}}>
                            <Row>
                                <Col>
                                    {isLoading ? null :
                                    <Button variant="outline-primary" size="sm"
                                            onClick={() => saveSvgAsPng(document.getElementById("swarmplot-div").children[0], "diagram.png")}>save image</Button>}
                                </Col>
                            </Row>
                            <Row><Col>&nbsp;</Col></Row>
                            <Row><Col>&nbsp;</Col></Row>
                            <Row>
                                <Col>
                                    {allCells.isLoading ? null :
                                    <FormGroup controlId="formBasicEmail">
                                        <FormLabel>Select Cell</FormLabel>
                                        <Typeahead
                                            options={[...allCells.data.data]}
                                            onChange={(selected) => {
                                                if (selected !== undefined && selected.length > 0) {
                                                    setCell(selected[0]);
                                                }
                                            }}
                                        />
                                    </FormGroup>}
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    {data !== null ?
                                        <>
                                            <FormLabel>Select Genes to Highlight</FormLabel>
                                            <FormControl type="text" size="sm" placeholder="Start typing to filter"
                                                         onChange={(event) => setFilterGenes(event.target.value)}/>
                                            <br/>
                                            <Card style={{height: "350px", overflowY: "scroll"}}>
                                                <Card.Body>
                                                    {[...new Set(data.map(d => d.y))]
                                                        .filter(gene => filterGenes === '' || gene.startsWith(filterGenes))
                                                        .sort().map(gene =>
                                                            <FormCheck type="checkbox"
                                                                       label={gene}
                                                                       checked={genes.has(gene)}
                                                                       onChange={(event) => {
                                                                           if (event.target.checked) {
                                                                               setGenes(new Set([...genes, gene]));
                                                                           } else {
                                                                               setGenes(new Set([...genes].filter(x => x !== gene)))
                                                                           }
                                                                       }}
                                                            />)}</Card.Body></Card>
                                            <br/>
                                            <Container fluid>
                                                <Row>
                                                    <Col>
                                                        <Button variant="outline-primary" size="sm"
                                                                onClick={() => setGenes(new Set(data.map(d => d.y)))}>
                                                            Select All</Button> <Button variant="outline-primary"
                                                                                        size="sm"
                                                                                        onClick={() => setGenes(new Set())}>Deselect All</Button>
                                                    </Col>
                                                </Row>
                                            </Container>
                                        </> : null}
                                </Col>
                            </Row>
                        </Container>
                    </Col>
                </Row>
            </Container>
        </div>
    );
}

export default SwarmPlotContainer;