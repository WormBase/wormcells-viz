import React, {useState, useEffect, useRef} from "react";
import { Heatmap, Dotplot } from "@wormbase/d3-charts";
import axios from 'axios';
import {
    Col,
    Row,
    Container,
    FormGroup,
    FormLabel,
    FormControl,
    Button,
    Spinner,
    ToggleButtonGroup, ToggleButton, FormCheck
} from "react-bootstrap";
import _ from 'lodash';

const HeatmapContainer = () => {

    const [genes, setGenes] = useState([]);
    const [cells, setCells] = useState([]);
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [dotplot, setDotplot] = useState(false);
    const [coloredDots, setColoredDots] = useState(true);
    const heatMapRef = useRef(null);
    const [heatMapSize, setHeatMapSize] = useState({top: 10, right: 25, bottom: 100, left: 100, width: 600,
        height: 650})
    const [relativeFreqs, setRelativeFreqs] = useState(true);
    const [maxExprFreq, setMaxExprFreq] = useState(0);
    const [minExprFreq, setMinExprFreq] = useState(0);

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
                    let pairArr = pair.split(" (");
                    if (pairArr.length > 1) {
                        return pair.split(" (")[1].slice(0, -1)
                    }
                }
            }
        });
        const res = await axios.post(apiEndpoint, {gene_ids: gene_ids, cell_names: cells});
        let threeColsData = [];
        let newGeneLabels = [];
        await Promise.all(Object.entries(res.data.response).map(async([gene_id, values]) => {
            let desc = await axios('http://rest.wormbase.org/rest/field/gene/' + gene_id + '/concise_description')
            let gene_name = await axios('http://rest.wormbase.org/rest/field/gene/' + gene_id + '/name')
            newGeneLabels.push([gene_name.data.name.data.label, gene_id]);
            Object.entries(values).forEach(([cell_name, value]) => {
                threeColsData.push({group: gene_name.data.name.data.label,
                    variable: cell_name, value: value,
                    tooltip_html: "Gene ID: <a href='https://wormbase.org/species/c_elegans/gene/" + gene_id +
                        "' target='_blank'>" + gene_id + "</a><br/>Gene Name: " + gene_name.data.name.data.label +
                        "<br/>Gene description: " + desc.data.concise_description.data.text +
                        "<br/><a href='ridge_line/" + gene_id + "'>View ridgeline plot for gene</a><br/>Cell Name: " +
                        cell_name + "<br/>" + "Expression Frequency: 10<sup>-" + (-Math.log10(value)).toFixed(4) + "</sup>"});
            })
        }));
        threeColsData = threeColsData.sort((a, b) => a.group + a.variable > b.group + b.variable ? 1 : -1)
        setMaxExprFreq(Math.max(...threeColsData.map(d => d.value)));
        setMinExprFreq(Math.min(...threeColsData.map(d => d.value)));
        setGenes(newGeneLabels.map(pair => pair[0] + " (" + pair[1] + ")").sort());
        setCells([...new Set(threeColsData.map(e => e.variable))]);
        setData(threeColsData);
        setIsLoading(false);
    }

    const drawHeatmap = async () => {
        setIsLoading(true);
        let d3Chart;
        let dataMod = data;
        if (dotplot) {
            d3Chart = new Dotplot('#heatmap-div', heatMapSize.top, heatMapSize.right, heatMapSize.bottom,
                heatMapSize.left, heatMapSize.width, heatMapSize.height, 0, 0.1, 0.001, 30, coloredDots, 20);
        } else {
            let minValue = 0;
            let maxValue = 0.1;
            if (relativeFreqs) {
                minValue = 0;
                maxValue = 1;
                dataMod = _.cloneDeep(data);
                dataMod.forEach((d, i) => {
                    dataMod[i].value = (d.value - minExprFreq) / (maxExprFreq - minExprFreq)
                });
            }
            d3Chart = new Heatmap('#heatmap-div', heatMapSize.top, heatMapSize.right, heatMapSize.bottom,
                heatMapSize.left, heatMapSize.width, heatMapSize.height, minValue, maxValue, 20);
        }
        d3Chart.draw(dataMod);
        setIsLoading(false);
    }

    return (
        <div>
            <Container fluid>
                <Row>
                    <Col sm={7} center>
                        <h2 className="text-center">Gene Expression {dotplot ? "Dotplot": "Heatmap"} </h2>
                    </Col>
                </Row>
                <Row>
                    <Col sm={7}>
                        <p className="text-center">{isLoading === true ? <Spinner animation="grow" /> : ''}</p>
                        <div id="heatmap-div" ref={heatMapRef}/>
                    </Col>
                    <Col sm={5}>
                        <div align="right">
                            <ToggleButtonGroup type="radio"  name="options" defaultValue={1}>
                                <ToggleButton variant="outline-primary" value={1} onClick={() => setDotplot(false)}>HeatMap</ToggleButton>
                                <ToggleButton variant="outline-primary" value={2} onClick={() => setDotplot(true)}>DotPlot</ToggleButton>
                            </ToggleButtonGroup>
                            {dotplot ?
                                <div>
                                    <br/>
                                    <FormGroup controlId="formBasicCheckbox">
                                        <FormCheck type="checkbox" label="Colored dots" checked={coloredDots}
                                                   onChange={() => setColoredDots(!coloredDots)}/>
                                    </FormGroup>
                                </div>
                                : null}
                            {!dotplot ?
                                <div>
                                    <br/>
                                    <FormGroup controlId="formBasicCheckbox">
                                        <FormCheck type="checkbox" label="Normalize data" checked={relativeFreqs}
                                                   onChange={() => setRelativeFreqs(!relativeFreqs)}/>
                                    </FormGroup>
                                </div>
                                : null}
                            {!dotplot && relativeFreqs ?
                                <p>Values in current view min: 10<sup>-{(-Math.log10(minExprFreq)).toFixed(4)}</sup> max: 10<sup>-{(-Math.log10(maxExprFreq)).toFixed(4)}</sup></p>
                            : null}
                        </div>
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
                        <Button onClick={() => fetchData()}>Update</Button>
                    </Col>
                </Row>
            </Container>
        </div>
    );
}

export default HeatmapContainer;