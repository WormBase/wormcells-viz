import React, {useEffect, useRef, useState} from "react";
import {useQuery} from "react-query";
import {Swarmplot} from "../d3-charts";
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
import {Typeahead} from "react-bootstrap-typeahead";
import _ from 'lodash';
import ExportImage from "../components/ExportImage";

const SwarmPlotContainer = () => {
    const [cell, setCell] = useState('');
    const [selectedCell, setSelectedCell] = useState('');
    const [genes, setGenes] = useState(new Set());
    const [tempNumGenes, setTempNumGenes] = useState(50);
    const [numGenes, setNumGenes] = useState(50);
    const [sortBy, setSortBy] = useState('p_value');
    const [sortAscending, setSortAscending] = useState("true");
    const [filterGenes, setFilterGenes] = useState('');
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const swarmRef = useRef(null);

    const [swarmplotSize, setSwarmplotSize] = useState({top: 50, right: 25, bottom: 50, left: 120, width: 1200,
        height: 650});

    const allCells = useQuery('allCells', async () => {
        let data = await axios.get(process.env.REACT_APP_API_ENDPOINT_READ_ALL_CELLS);
        data = data.data.sort();
        return data;
    });

    useEffect(() => {
        fetchData(cell);
    }, [cell, numGenes, sortBy, sortAscending]);

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
        const res = await axios.post(apiEndpoint, {cell: cell, max_num_genes: numGenes, sort_by: sortBy, ascending: sortAscending});
        setSelectedCell(res.data.cell);
        let dataMod = [];
        await Promise.all(Object.entries(res.data.response).map(async([gene_id, [refVal, values]]) => {
            let gene_name = await axios(process.env.REACT_APP_WORMBASE_GENE_NAME + "/" + gene_id)
            gene_name = gene_name.data;
            values.forEach(([cell_name, rawVal, logfc]) => {
                if (cell_name !== cell) {
                    dataMod.push(
                        {
                            x: logfc,
                            y: gene_name,
                            tooltip_html:
                                "<div><strong>Cell type</strong>: " + cell_name + "<br/>" +
                                "<strong>Gene</strong>: " + gene_name + "<br/>" +
                                "<strong>" + cell_name + " expression</strong>: 10<sup>" + rawVal.toFixed(1) + "</sup><br/>" +
                                "<strong>" + res.data.cell + " expression</strong>: 10<sup>" + refVal.toFixed(1) + "</sup><br/>" +
                                "<strong>log2 fold change</strong>: " + logfc.toFixed(1) + "</div>",
                            selected: genes.has(gene_name)
                        });
                }
            });
        }));
        setData(dataMod);
        setIsLoading(false);
        setSwarmplotSize(swarmplotSize => ({...swarmplotSize, height: (new Set(dataMod.map(d => d.y))).size * 15 + swarmplotSize.top + swarmplotSize.bottom}));
    }

    const drawSwarmplot = async () => {
        setIsLoading(true);
        const d3Swarmplot = new Swarmplot('#swarmplot-div', swarmplotSize.top, swarmplotSize.right, swarmplotSize.bottom,
            swarmplotSize.left, swarmplotSize.width, swarmplotSize.height, 20, [Math.min(-10, Math.min(...data.map(d => d.x)) -1), Math.max(10, Math.max(...data.map(d => d.x)) +1)]);
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
                    <Col md={7}>
                        <Container fluid style={{paddingLeft: 0, paddingRight: 0}}>
                            <Row>
                                <Col sm={12} center>
                                    <h5 className="text-center">Relative Log-fold change in expression of top {numGenes} specific genes for cell '{selectedCell}'</h5>
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
                    <Col md={5}>
                        <Container fluid style={{paddingLeft: 0, paddingRight: 0}}>
                            <Row>
                                <Col>
                                    {isLoading ? null : <ExportImage nodeId="swarmplot-div"/>}
                                </Col>
                            </Row>
                            <Row><Col>&nbsp;</Col></Row>
                            <Row><Col>&nbsp;</Col></Row>
                            <Row>
                                <Col>
                                    {allCells.isLoading ? null :
                                    <FormGroup controlId="formBasicEmail">
                                        <h5>Select Cell (from those in the dataset)</h5>
                                        <Typeahead
                                            options={[...allCells.data]}
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
                                            <Card>
                                            <Card.Body>
                                                <FormLabel>Select Genes to Highlight</FormLabel>
                                                <FormControl type="text" size="sm" placeholder="Start typing to filter"
                                                             onChange={(event) => setFilterGenes(event.target.value)}/>
                                                <br/>
                                                <Card style={{height: "250px", overflowY: "scroll"}}>
                                                    <Card.Body>
                                                        {[...new Set(data.map(d => d.y))]
                                                            .filter(gene => filterGenes === '' || gene.toLowerCase().startsWith(filterGenes.toLowerCase()))
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
                                            </Card.Body>
                                            </Card>

                                            <br/>
                                            <Container fluid>
                                                <Row>
                                                    <Col>
                                                        <FormLabel>Sort by</FormLabel>
                                                        <FormControl as="select"
                                                                     onChange={(event) => setSortBy(event.target.value)}
                                                                     value={sortBy}
                                                        >
                                                            <option value="p_value">p-value</option>
                                                            <option value="lfc">log-fold change</option>
                                                            <option value="expr">expression value</option>
                                                        </FormControl>
                                                    </Col>
                                                    <Col>
                                                        <FormLabel>&nbsp;</FormLabel><br/>
                                                        <FormControl as="select"
                                                                     onChange={(event) => setSortAscending(event.target.value)}
                                                                     value={sortAscending}
                                                        >
                                                            <option value="true">Ascending</option>
                                                            <option value="false">Descending</option>
                                                        </FormControl>
                                                    </Col>
                                                    <Col>
                                                        <FormLabel>Max # of genes</FormLabel>
                                                        <FormControl onChange={(event) => setTempNumGenes(event.target.value)}
                                                                     value={tempNumGenes}/>
                                                    </Col>
                                                    <Col>
                                                        <FormLabel>&nbsp;</FormLabel><br/>
                                                        <Button variant="outline-primary" onClick={() => setNumGenes(tempNumGenes)}>Update</Button>
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