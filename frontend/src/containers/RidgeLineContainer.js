import React, {useEffect, useRef, useState} from "react";
import {Button, Col, Container, FormGroup, FormLabel, Row, Spinner} from "react-bootstrap";
import axios from "axios";
import { Ridgeline } from "@wormbase/d3-charts";
import AsyncTypeahead from "react-bootstrap-typeahead/lib/components/AsyncTypeahead";
import {useQuery} from "react-query";
import {saveSvgAsPng} from "save-svg-as-png";


const RidgeLineContainer = ({match:{params:{gene_param}}}) => {

    const [gene, setGene] = useState(gene_param !== "default" ? gene_param : '');
    const [data, setData] = useState(null);
    const [geneID, setGeneID] = useState('');
    const [geneName, setGeneName] = useState('');
    const [geneDescription, setGeneDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [typeheadOptions, setTypeheadOptions] = useState([]);
    const ridgeLineRef = useRef(null);
    const [ridgeLineSize, setRidgeLineSize] = useState({top: 50, right: 25, bottom: 30, left: 120, width: 1200,
        height: 650});

    const allGenes = useQuery('allGenes', async () => {
        let res = await axios.get(process.env.REACT_APP_API_ENDPOINT_READ_ALL_GENES);
        res.data = new Set(res.data);
        return res;
    });

    useEffect(() => {
        fetchData(gene);
    }, []);

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

    const fetchData = async (gene_id) => {
        setIsLoading(true);
        let apiEndpoint = process.env.REACT_APP_API_ENDPOINT_READ_DATA_RIDGELINE;
        const res = await axios.post(apiEndpoint, {gene_id: gene_id});
        setGene(res.data.gene_id);
        let data = {}
        for (const [key, value] of Object.entries(res.data.response)) {
            let cellName = key.replaceAll('_', ' ').trim();
            data[cellName] = value.map(e => -Math.log10(e));
        }
        data = Object.keys(data).sort().reduce(
            (obj, key) => {
                obj[key] = data[key];
                return obj;
            }, {}
        );
        let desc = await axios('http://rest.wormbase.org/rest/field/gene/' + res.data.gene_id + '/concise_description')
        let geneName = await axios('http://rest.wormbase.org/rest/field/gene/' + res.data.gene_id + '/name')
        setGeneName(geneName.data.name.data.label);
        setGeneID(res.data.gene_id);
        setGeneDescription(desc.data.concise_description.data.text);
        setData(data);
        setRidgeLineSize(ridgeLineSize => ({...ridgeLineSize, height: 50 * Object.keys(data).length}))
        setIsLoading(false);
    }

    const drawRidgeLine = async () => {
        setIsLoading(true);
        const d3RidgeLine = new Ridgeline('#ridgeline-div', ridgeLineSize.top, ridgeLineSize.right, ridgeLineSize.bottom,
            ridgeLineSize.left, ridgeLineSize.width, ridgeLineSize.height, [1e-10,1e1], [0, 200], 0.5, 20);
        d3RidgeLine.draw(data);
        setIsLoading(false);
    }

    return (
        <div>
            <Container fluid>
                <Row>
                    <Col sm={8} center>
                        <Container fluid style={{paddingLeft: 0, paddingRight: 0}}>
                            <Row>
                                <Col>
                                    <h2 className="text-center">Gene Expression Ridgeline Chart</h2>
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
                    <Col sm={4}>
                        {isLoading ? null : <Button variant="warning" size="sm"
                                            onClick={() => saveSvgAsPng(document.getElementById("ridgeline-div").children[0], "diagram.png")}>Export image</Button>}
                        <br/>
                        <br/>
                        {allGenes.isLoading ?
                            <Spinner animation="grow"/>
                            :
                            <FormGroup controlId="formBasicEmail">
                                <FormLabel>Load Gene</FormLabel>
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
                                                fetchData(gene_id);
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
                        </div>
                    </Col>
                </Row>
            </Container>
        </div>
    );
}

export default RidgeLineContainer;