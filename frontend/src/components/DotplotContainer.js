import React, {useState, useEffect, useRef} from "react";
import { Dotplot } from "@wormbase/d3-charts";
import axios from 'axios';
import {Col, Row, Container, FormGroup, FormLabel, FormControl, Button, Spinner} from "react-bootstrap";

const DotplotContainer = () => {

    const [genes, setGenes] = useState([]);
    const [cells, setCells] = useState([]);
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const dotplotRef = useRef(null);
    const [dotplotSize, setDotplotSize] = useState({top: 10, right: 25, bottom: 100, left: 100, width: 600,
        height: 650})

    useEffect(() => {
        fetchData();
    }, [])

    useEffect(() => {
        if (data !== null) {
            drawDotplot();
        }
    }, [dotplotSize, data])

    useEffect(() => {
        let width = dotplotRef.current ? dotplotRef.current.offsetWidth : 0
        if (width !== dotplotSize.width) {
            setDotplotSize(dotplotSize => ({...dotplotSize, width: width}));
        }
        const resizeListener = () => {
            let width = dotplotRef.current ? dotplotRef.current.offsetWidth : 0
            setDotplotSize(dotplotSize => ({...dotplotSize, width: width}));
        };
        window.addEventListener('resize', resizeListener);
        return () => {
            window.removeEventListener('resize', resizeListener);
        }
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        let apiEndpoint = process.env.REACT_APP_API_ENDPOINT_READ_DATA_HEATMAP;
        const res = await axios.post(apiEndpoint, {gene_ids: genes, cell_names: cells});
        let threeColsData = [];
        await Promise.all(Object.entries(res.data.response).map(async([gene_id, values]) => {
            let desc = await axios('http://rest.wormbase.org/rest/field/gene/' + gene_id + '/concise_description')
            let gene_name = await axios('http://rest.wormbase.org/rest/field/gene/' + gene_id + '/name')
            Object.entries(values).forEach(([cell_name, value]) => {
                threeColsData.push({group: gene_name.data.name.data.label,
                    variable: cell_name, value: value,
                    tooltip_html: "Gene ID: <a href='https://wormbase.org/species/c_elegans/gene/'" + gene_id +
                        " target='_blank'>" + gene_id + "</a><br/>Gene Name: " + gene_name.data.name.data.label +
                        "<br/>Gene description: " + desc.data.concise_description.data.text +
                        "<br/><a href='ridge_line/" + gene_id + "'>View ridgeline plot for gene</a><br/>Cell Name: " +
                        cell_name + "<br/>" + "Expression Frequency: 10<sup>-" + (-Math.log10(value)).toFixed(4) + "</sup>"});
            })
        }));
        threeColsData = threeColsData.sort((a, b) => a.group + a.variable > b.group + b.variable ? 1 : -1)
        setGenes([...new Set(threeColsData.map(e => e.variable))]);
        setCells([...new Set(threeColsData.map(e => e.group))]);
        setData(threeColsData);
        setIsLoading(false);
    }

    const drawDotplot = async () => {
        setIsLoading(true);
        const d3heatmap = new Dotplot('#heatmap-div', dotplotSize.top, dotplotSize.right, dotplotSize.bottom,
            dotplotSize.left, dotplotSize.width, dotplotSize.height, 0, 0.1);
        d3heatmap.draw(data);
        setIsLoading(false);
    }

    return (
        <div>
            <Container fluid>
                <Row>
                    <Col sm={7} center>
                        <h2 className="text-center">Gene Expression Dotplot</h2>
                    </Col>
                </Row>
                <Row>
                    <Col sm={7}>
                        <p className="text-center">{isLoading === true ? <Spinner animation="grow" /> : ''}</p>
                        <div id="heatmap-div" ref={dotplotRef}/>
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
                        <Button onClick={() => fetchData()}>Update</Button>
                    </Col>
                </Row>
            </Container>
        </div>
    );
}

export default DotplotContainer;