import React, {useState, useEffect, useRef} from "react";
import { Heatmap, Dotplot } from "@wormbase/d3-charts";

import axios from 'axios';
import * as d3 from 'd3';
import {
    Col,
    Row,
    Container,
    Button,
    Spinner,
    ToggleButtonGroup, ToggleButton, FormCheck, Tab, Nav, Form, Modal
} from "react-bootstrap";
import _ from 'lodash';
import MultiSelect from "../components/multiselect/MultiSelect";
import {useQuery} from "react-query";
import {clearLegend, drawHeatmapLegend} from "../d3-charts";
import ExportImage from "../components/ExportImage";
import CellCheckboxSelector from "../components/CellCheckboxSelector";

const HeatmapContainer = () => {

    const [genes, setGenes] = useState([]);
    const [cells, setCells] = useState(new Set());
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [dotplot, setDotplot] = useState(false);
    const [coloredDots, setColoredDots] = useState(true);
    const heatMapRef = useRef(null);
    const [heatMapSize, setHeatMapSize] = useState({top: 0, right: 15, bottom: 60, left: 140, width: 600,
        height: 650})
    const [relativeFreqs, setRelativeFreqs] = useState(true);
    const [maxExprFreq, setMaxExprFreq] = useState(0);
    const [minExprFreq, setMinExprFreq] = useState(0);
    const [excludedEntities, setExcludedEntities] = useState([]);

    const allCells = useQuery('allCells', async () => {
        let data = await axios.get(process.env.REACT_APP_API_ENDPOINT_READ_ALL_CELLS);
        data = data.data.sort();
        return data;
    });

    useEffect(() => {
        fetchData();
    }, [])

    useEffect(() => {
        if (data !== null) {
            drawHeatmap();
        }
    }, [heatMapSize, data, dotplot, coloredDots, relativeFreqs])

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
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        let apiEndpoint = process.env.REACT_APP_API_ENDPOINT_READ_DATA_HEATMAP;
        let gene_ids = genes.map(pair => {
            if (pair !== "" ) {
                if (pair.startsWith("WBGene")) {
                    return pair
                } else {
                    let pairArr = pair.split(' [');
                    pairArr = pairArr[0].split(" ( ");
                    if (pairArr.length > 1) {
                        return pairArr[1].slice(0, -2)
                    }
                }
            }
        });
        const res = await axios.post(apiEndpoint, {gene_ids: gene_ids, cell_names: [...cells]});
        let threeColsData = [];
        let newGeneLabels = [];
        let newCells = new Set();
        await Promise.all(Object.entries(res.data.response).map(async([gene_id, values]) => {
            let desc = await axios(process.env.REACT_APP_WORMBASE_GENE_DESC + "/" + gene_id)
            let gene_name = await axios(process.env.REACT_APP_WORMBASE_GENE_NAME + "/" + gene_id)
            newGeneLabels.push([gene_name.data, gene_id]);
            Object.entries(values).forEach(([cell_name, value]) => {
                threeColsData.push({
                    group: gene_name.data,
                    variable: cell_name.replaceAll('_', ' ').trim(), value: 10**value,
                    tooltip_html: "<div id='currentTooltip'/><button class='btn-secondary small' style='float: right;' " +
                        "onclick='(function(){getElementById(\"currentTooltip\").parentElement.style.opacity = \"0\"; " +
                        "getElementById(\"currentTooltip\").parentElement.innerHTML = \"\";})();'>X</button>" +
                        "Gene ID: <a href='https://wormbase.org/species/c_elegans/gene/" + gene_id +
                        "' target='_blank'>" + gene_id + "</a><br/>Gene Name: " + gene_name.data +
                        "<br/>Gene description: " + desc.data +
                        "<br/><a href='ridge_line/" + gene_id + "'>View expression histogram for this gene</a><br/>Cell Name: " +
                        cell_name + "<br/>" + "Expression Frequency: 10<sup>" + value.toFixed(1) + "</sup>"
                });
                newCells.add(cell_name);
            })
        }));
        threeColsData = threeColsData.sort((a, b) => a.group + a.variable > b.group + b.variable ? 1 : -1)
        setMaxExprFreq(Math.max(...threeColsData.map(d => d.value)));
        setMinExprFreq(Math.min(...threeColsData.map(d => d.value)));
        setGenes(newGeneLabels.map(pair => pair[0] + " ( " + pair[1] + " )").sort());
        setCells(newCells);
        setData(threeColsData);
        setIsLoading(false);
        setHeatMapSize(heatMapSize => ({...heatMapSize, height: newCells.size * 28 + heatMapSize.top + heatMapSize.bottom}));
        setExcludedEntities(res.data.excludedEntities)
    }

    const drawHeatmap = async () => {
        setIsLoading(true);
        let d3Chart;
        let dataMod = data;
        let minValue = 0;
        let maxValue = 0.1;
        if (relativeFreqs) {
            minValue = minExprFreq;
            maxValue = maxExprFreq;
            dataMod = _.cloneDeep(data);
            dataMod.forEach((d, i) => {
                dataMod[i].value = (d.value - minExprFreq) / (maxExprFreq - minExprFreq) + 0.000000001
            });
            minValue = 0;
            maxValue = 1;
        }
        if (dotplot) {
            let circleSizeMultiplier = 30;
            if (relativeFreqs) {
                circleSizeMultiplier = 1;
            }
            d3Chart = new Dotplot('#heatmap-div', heatMapSize.top, heatMapSize.right, heatMapSize.bottom,
                heatMapSize.left, heatMapSize.width, heatMapSize.height, minValue, maxValue, 0.001, circleSizeMultiplier, coloredDots, 24, 12);
        } else {
            d3Chart = new Heatmap('#heatmap-div', heatMapSize.top, heatMapSize.right, heatMapSize.bottom,
                heatMapSize.left, heatMapSize.width, heatMapSize.height, minValue, maxValue, 24, 12);
        }
        d3Chart.draw(dataMod);

        let legendDomain = [minValue, maxValue];
        if (relativeFreqs) {
            legendDomain = [minExprFreq, maxExprFreq];
        }
        let myScale = d3.scaleLinear()
            .domain(legendDomain);

        let myColor = d3.scaleSequential(
            (d) => d3.interpolateViridis(myScale(d))
        )

        if (!coloredDots && dotplot) {
            clearLegend("#legend");
        } else {
            drawHeatmapLegend("#legend", myColor, legendDomain[0], legendDomain[1], 50, heatMapSize.width, 0, heatMapSize.right, 20, heatMapSize.left)
        }
        setIsLoading(false);
    }

    return (
        <div>
            <Container fluid>
                <Row>
                    <Col md={7} center>
                        <Container fluid style={{paddingLeft: 0, paddingRight: 0}}>
                            <Row>
                                <Col>
                                    <h3 className="text-center">Gene Expression {dotplot ? "Dotplot": "Heatmap"} </h3>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <p className="text-center">{isLoading === true ? <Spinner animation="grow" /> : ''}</p>
                                    <div id="heatmap-div" ref={heatMapRef}/>
                                    {!isLoading && (!dotplot || coloredDots) ?
                                        <span style={{marginLeft: heatMapSize.left}}>Expression Frequency</span>
                                        : null}
                                    <div id="legend"/>
                                </Col>
                            </Row>
                        </Container>
                    </Col>
                    <Col md={5}>
                        <Container fluid style={{paddingLeft: 0, paddingRight: 0}}>
                            <Row>
                                <Col>
                                    {isLoading ? null : <ExportImage nodeId="heatmap-div"/>}
                                </Col>
                                <Col>
                                    <div align="right">
                                        <ToggleButtonGroup type="radio"  name="options" defaultValue={1}>
                                            <ToggleButton variant="outline-primary" size="sm" value={1} onClick={() => setDotplot(false)}>HeatMap</ToggleButton>
                                            <ToggleButton variant="outline-primary" size="sm" value={2} onClick={() => setDotplot(true)}>DotPlot</ToggleButton>
                                        </ToggleButtonGroup>
                                    </div>
                                </Col>
                            </Row>

                        </Container>
                        <div align="right">
                            <br/>
                            <Form>
                                <div className="mb-2">
                            {dotplot ?
                                <FormCheck inline type="checkbox" label="Colored dots" checked={coloredDots}
                                           onChange={() => setColoredDots(!coloredDots)}/>
                                : null}
                            <FormCheck inline type="checkbox" label="Normalize values" checked={relativeFreqs}
                                       onChange={() => setRelativeFreqs(!relativeFreqs)}/>
                                </div>
                            {relativeFreqs ?
                                <p>Values in current view min: 10<sup>-{(-Math.log10(minExprFreq)).toFixed(1)}</sup> max: 10<sup>-{(-Math.log10(maxExprFreq)).toFixed(1)}</sup></p>
                                : null}
                            </Form>
                        </div>
                        <Tab.Container defaultActiveKey={1}>
                            <Row>
                                <Col>
                                    <Nav variant="tabs" defaultActiveKey={1}>
                                        <Nav.Item>
                                            <Button onClick={() => fetchData()}>Refresh</Button><div style={{width: '7em'}}/>
                                        </Nav.Item>
                                        <Nav.Item>
                                            <Nav.Link eventKey={1}>Genes</Nav.Link>
                                        </Nav.Item>
                                        <Nav.Item>
                                            <Nav.Link eventKey={2}>Cells</Nav.Link>
                                        </Nav.Item>
                                    </Nav>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <Tab.Content>
                                        <Tab.Pane eventKey={0}>Test</Tab.Pane>
                                        <Tab.Pane eventKey={1}>
                                            <br/>
                                            {process.env.REACT_APP_PREDEFINED_GENE_LISTS !== "" ?
                                            <div>
                                                <center>Load genes from pre-defined lists:</center>
                                                <Form.Control as="select" size="sm" onChange={(e) => setGenes(JSON.parse(process.env.REACT_APP_PREDEFINED_GENE_LISTS)[parseInt(e.target.value)-1].genes)}>
                                                    {JSON.parse(process.env.REACT_APP_PREDEFINED_GENE_LISTS).map(list => <option value={list.idx}>{list.name}</option>)}
                                                </Form.Control>
                                                <br/>
                                            </div> :
                                                null
                                            }
                                            <MultiSelect
                                                linkWB={"https://wormbase.org/species/c_elegans/gene"}
                                                itemsNameSingular={"gene"}
                                                itemsNamePlural={"genes"}
                                                items={genes}
                                                addMultipleItemsFunction={(items) => setGenes([...genes, ...items])}
                                                remAllItems={() => setGenes([])}
                                                remItemFunction={(gene) => setGenes(genes.filter(g => g !== gene))}
                                                searchType={"gene"}
                                                sampleQuery={"e.g. dbl-1"}
                                                listIDsAPI={process.env.REACT_APP_WORMBASE_GENE_NAME}
                                            />
                                        </Tab.Pane>
                                        <Tab.Pane eventKey={2}>
                                            <br/>
                                            {allCells.isLoading ?
                                                <Spinner animation="grow"/>
                                                :
                                                <CellCheckboxSelector allCells={allCells} cells={cells} setCellsCallback={(retCells) => setCells(retCells)}/>
                                            }
                                        </Tab.Pane>
                                    </Tab.Content>
                                </Col>
                            </Row>
                        </Tab.Container>
                        <br/>
                        {/*<FormGroup controlId="exampleForm.ControlTextarea1">*/}
                        {/*    <FormLabel>Genes</FormLabel>*/}
                        {/*    <FormControl as="textarea" rows={6}*/}
                        {/*                 value={genes.join('\n')}*/}
                        {/*                 onChange={(event) => setGenes(event.target.value.split('\n'))}/>*/}
                        {/*</FormGroup>*/}
                        <br/>
                        <br/>
                    </Col>
                </Row>
            </Container>
            <Modal show={excludedEntities.length > 0}>
                <Modal.Body>
                    The following entities were not found in the dataset and have been removed from the selection:
                    <br/>
                    {excludedEntities.map(e => {return <p>{e}</p>})}
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setExcludedEntities([])}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default HeatmapContainer;