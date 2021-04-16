import React, {useEffect, useRef, useState} from "react";
import {Button, Col, Container, FormControl, FormGroup, FormLabel, Row, Spinner} from "react-bootstrap";
import axios from "axios";
import { Ridgeline } from "@wormbase/d3-charts";

const RidgeLineContainer = ({match:{params:{gene_param}}}) => {

    const [gene, setGene] = useState(gene_param !== "default" ? gene_param : '');
    const [data, setData] = useState(null);
    const [geneName, setGeneName] = useState('');
    const [geneDescription, setGeneDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const ridgeLineRef = useRef(null);
    const [ridgeLineSize, setRidgeLineSize] = useState({top: 30, right: 25, bottom: 30, left: 300, width: 1200,
        height: 650});

    useEffect(() => {
        fetchData();
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

    const fetchData = async () => {
        setIsLoading(true);
        let apiEndpoint = process.env.REACT_APP_API_ENDPOINT_READ_DATA_RIDGELINE;
        const res = await axios.post(apiEndpoint, {gene_id: gene});
        setGene(res.data.gene_id);
        let data = {}
        for (const [key, value] of Object.entries(res.data.response)) {
            data[key] = value.map(e => -Math.log10(e));
        }
        data = Object.keys(data).sort().reduce(
            (obj, key) => {
                obj[key] = data[key];
                return obj;
            },
            {}
        );
        let desc = await axios('http://rest.wormbase.org/rest/field/gene/' + res.data.gene_id + '/concise_description')
        let geneName = await axios('http://rest.wormbase.org/rest/field/gene/' + res.data.gene_id + '/name')
        setGeneName(geneName.data.name.data.label);
        setGeneDescription(desc.data.concise_description.data.text);
        setData(data);
        setRidgeLineSize(ridgeLineSize => ({...ridgeLineSize, height: 20 * Object.keys(data).length}))
        setIsLoading(false);
    }

    const drawRidgeLine = async () => {
        setIsLoading(true);
        const d3RidgeLine = new Ridgeline('#ridgeline-div', ridgeLineSize.top, ridgeLineSize.right, ridgeLineSize.bottom,
            ridgeLineSize.left, ridgeLineSize.width, ridgeLineSize.height, [-0.1,10], [0, 300], 0.01,);
        d3RidgeLine.draw(data);
        setIsLoading(false);
    }

    return (
        <div>
            <Container fluid>
                <Row>
                    <Col sm={7} center>
                        <h2 className="text-center">Gene Expression Ridgeline Chart</h2>
                    </Col>
                </Row>
                <Row>
                    <Col sm={7}>
                        <p className="text-center">{isLoading === true ? <Spinner animation="grow" /> : ''}</p>
                        <div id="ridgeline-div" ref={ridgeLineRef}/>
                    </Col>
                    <Col sm={5}>
                        <FormGroup controlId="formBasicEmail">
                            <FormLabel>Load Gene</FormLabel>
                            <FormControl type="input" placeholder="Gene ID" value={gene} onChange={(event) => setGene(event.target.value)}/>
                        </FormGroup>
                        <Button onClick={() => fetchData()}>Update</Button>
                        <div>
                            <br/><br/>
                            <strong>Gene ID:</strong> <a href={'https://wormbase.org/species/c_elegans/gene/' + gene} target='_blank'>{gene}</a><br/>
                            <strong>Gene Name:</strong> {geneName} <br/>
                            <strong>Gene Description:</strong> {geneDescription}
                            <br/><br/>
                            *Values on the X axis are 10<sup>-x</sup>
                        </div>
                    </Col>
                </Row>
            </Container>
        </div>
    );
}

export default RidgeLineContainer;