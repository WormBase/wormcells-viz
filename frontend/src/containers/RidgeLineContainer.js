import React, {useEffect, useRef, useState} from "react";
import {Button, Col, Container, FormCheck, FormGroup, FormLabel, Row, Spinner} from "react-bootstrap";
import axios from "axios";
import AsyncTypeahead from "react-bootstrap-typeahead/lib/components/AsyncTypeahead";
import {useQuery} from "react-query";
import {saveSvgAsPng} from "save-svg-as-png";
import {Histograms} from "../d3-charts";
import _ from 'lodash';
import CellCheckboxSelector from "../components/CellCheckboxSelector";
import ExportImage from "../components/ExportImage";


const RidgeLineContainer = ({match:{params:{gene_param}}}) => {

    const [gene, setGene] = useState(gene_param !== "default" ? gene_param : '');
    const [cells, setCells] = useState([]);
    const [sortByFreq, setSortByFreq] = useState(false);
    const [data, setData] = useState(null);
    const [geneID, setGeneID] = useState('');
    const [geneName, setGeneName] = useState('');
    const [geneDescription, setGeneDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [typeheadOptions, setTypeheadOptions] = useState([]);
    const ridgeLineRef = useRef(null);
    const [ridgeLineSize, setRidgeLineSize] = useState({top: 100, right: 25, bottom: 30, left: 120, width: 1200,
        height: 650});

    const allGenes = useQuery('allGenes', async () => {
        let res = await axios.get(process.env.REACT_APP_API_ENDPOINT_READ_ALL_GENES);
        res.data = new Set(res.data);
        return res;
    });

    const allCells = useQuery('allCells', async () => {
        let data = await axios.get(process.env.REACT_APP_API_ENDPOINT_READ_ALL_CELLS);
        data = data.data.sort();
        return data;
    });

    useEffect(() => {
        fetchData(gene, cells);
    }, [sortByFreq]);

    useEffect(() => {
        if (data !== null) {
            drawRidgeLine();
        }
    }, [data, ridgeLineSize]);

    useEffect(() => {
        let width = ridgeLineRef.current ? ridgeLineRef.current.offsetWidth : 0
        if (width !== ridgeLineSize.width) {
            setRidgeLineSize(ridgelineSize => ({...ridgelineSize, width: width}));
        }
        const resizeListener = () => {
            let width = ridgeLineRef.current ? ridgeLineRef.current.offsetWidth : 0
            setRidgeLineSize(ridgeLineSize => ({...ridgeLineSize, width: width}));
        };
        window.addEventListener('resize', resizeListener);
        return () => {
            window.removeEventListener('resize', resizeListener);
        }
    }, []);

    const fetchData = async (gene_id, cell_names) => {
        setIsLoading(true);
        let apiEndpoint = process.env.REACT_APP_API_ENDPOINT_READ_DATA_RIDGELINE;
        const res = await axios.post(apiEndpoint,
            {
                gene_id: gene_id,
                cell_names: [...cell_names],
                sort_by_freq: sortByFreq
            });
        setGene(res.data.gene_id);
        let data = []
        let color = 1;
        let sortedCells;
        if (sortByFreq) {
            let cellsFreq = [...Object.keys(res.data.response).map((key, index) => [key, res.data.response[key][1]])]
            cellsFreq.sort((a, b) => b[1] - a[1])
            sortedCells = cellsFreq.map(cellFreq => cellFreq[0])
        } else {
            sortedCells = [...Object.keys(res.data.response)].sort();
        }
        let cellNames = [];
        sortedCells.forEach(key => {
            let value = res.data.response[key][0];
            let cellName = key.replaceAll('_', ' ').trim();
            cellNames.push(cellName);
            let maxY = Math.max(...value);
            let cellsCount = _.sum([...value]);
            value.forEach((v, i) => data.push({
                c: cellName + " (" + cellsCount + ")",
                x: i,
                y: v/maxY,
                color: color,
                tooltip_html: "<strong>Number of cells in this bin:</strong> " + v + "<br/>" +
                    "<strong>Total number of cells:</strong> " + cellsCount + "<br/>" +
                    "<strong>Expression frequency:</strong> 10<sup>" + ((i - 100) / 10).toFixed(1) + "</sup>"
            }));
            color++;
        });

        // data = Object.keys(data).sort().reduce(
        //     (obj, key) => {
        //         obj[key] = data[key];
        //         return obj;
        //     }, {}
        // );


        let desc = await axios(process.env.REACT_APP_WORMBASE_GENE_DESC + "/" + res.data.gene_id)
        let geneName = await axios(process.env.REACT_APP_WORMBASE_GENE_NAME + "/" + res.data.gene_id)
        setGeneName(geneName.data);
        setGeneID(res.data.gene_id);
        setGeneDescription(desc.data);
        setData(data);
        setCells(cellNames);
        setRidgeLineSize(ridgeLineSize => ({...ridgeLineSize, height: 50 * Object.keys(res.data.response).length + ridgeLineSize.top + ridgeLineSize.bottom}))
        setIsLoading(false);
    }

    const drawRidgeLine = async () => {
        setIsLoading(true);
        const d3RidgeLine = new Histograms('#ridgeline-div', ridgeLineSize.top, ridgeLineSize.right, ridgeLineSize.bottom,
            ridgeLineSize.left, ridgeLineSize.width, ridgeLineSize.height, [0,100], [0, 200], 20);
        d3RidgeLine.draw(data);
        setIsLoading(false);
    }

    return (
        <div>
            <Container fluid>
                <Row>
                    <Col md={8} center>
                        <Container fluid style={{paddingLeft: 0, paddingRight: 0}}>
                            <Row>
                                <Col>
                                    <h2 className="text-center">Gene Expression Histograms</h2>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <p className="text-center">{isLoading === true ? <Spinner animation="grow" /> : ''}</p>
                                    <div id="ridgeline-div" ref={ridgeLineRef}/>
                                </Col>
                            </Row>
                        </Container>
                    </Col>
                    <Col md={4}>
                        {isLoading ? null : <ExportImage nodeId="ridgeline-div"/>}
                        <br/>
                        <br/>
                        {allGenes.isLoading ?
                            <Spinner animation="grow"/>
                            :
                            <FormGroup controlId="formBasicEmail">
                                <h5>Select Gene (from those in the dataset)</h5>
                                <AsyncTypeahead
                                    onSearch={(query) => {
                                        axios.get(process.env.REACT_APP_API_AUTOCOMPLETE_ENDPOINT + '&objectType=gene&userValue=' + query)
                                            .then(res => {
                                                let options = res.data.split('\n').filter(item => item !== 'more ...' && item !== '')
                                                options = options.filter(item => allGenes.data.data.has(item.split(' ( ')[1].split(' )')[0]));
                                                setTypeheadOptions(options);
                                            });
                                    }}
                                    onChange={(selected) => {
                                        if (selected !== undefined && selected.length > 0) {
                                            let gene_id_first = selected[0].split(' ( ')[1];
                                            if (gene_id_first !== undefined) {
                                                let gene_id = gene_id_first.split(' )')[0];
                                                fetchData(gene_id, cells);
                                            }
                                        }
                                    }}
                                    options={typeheadOptions}
                                />
                            </FormGroup>}
                        <div>
                            <br/>
                            <strong>Gene ID:</strong> <a href={'https://wormbase.org/species/c_elegans/gene/' + gene} target='_blank'>{geneID}</a><br/>
                            <strong>Gene Name:</strong> {geneName} <br/>
                            <strong>Gene Description:</strong> {geneDescription}
                            <br/>
                            <br/>
                            <h5>Select cells</h5>
                            {allCells.isLoading ?
                                <Spinner animation="grow"/>
                                :
                                <div>
                                    <CellCheckboxSelector allCells={allCells} cells={cells} setCellsCallback={(retCells) =>
                                        setCells(retCells)}/>
                                    <Button onClick={() => fetchData(gene, cells)}>Refresh</Button>
                                    <br/>
                                    <br/>
                                    <FormCheck type="checkbox"
                                               label="Sort by average expression frequency"
                                               checked={sortByFreq}
                                               onChange={(event) => setSortByFreq(!sortByFreq)}
                                    />
                                </div>
                            }
                            <br/>
                            <small>
                                <ul>
                                    <li> Note that colors are used to make it easier to identify the different plots but they do not convey any information.</li>
                                    <li> The values in parenthesis next to cell type indicate how many cells had that label in the dataset.</li>
                                </ul>
                            </small>
                        </div>
                    </Col>
                </Row>
            </Container>
        </div>
    );
}

export default RidgeLineContainer;