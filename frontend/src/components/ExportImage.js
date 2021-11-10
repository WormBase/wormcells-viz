import React, {useState} from "react";
import {Button, Form} from "react-bootstrap";
import * as htmlToImage from "html-to-image";
import download from "downloadjs";
import { jsPDF } from "jspdf";
import {FiChevronDown, FiChevronUp} from "react-icons/all";

const downloadPNG = (node, filename = 'diagram', height = undefined, width = undefined) => {
    htmlToImage.toPng(node, {backgroundColor: 'white', canvasWidth: width, canvasHeight: height})
        .then(function (dataUrl) {
            download(dataUrl, filename + '.png');
        });
}

const filter = (node) => {
    return (node.tagName !== 'i');
}

const downloadSVG = (node, filename = 'diagram', height = undefined, width = undefined) => {
    htmlToImage.toSvg(node, { filter: filter, backgroundColor: 'white', canvasHeight: height, canvasWidth: width })
        .then(function (dataUrl) {
            download(dataUrl, filename + '.svg');
        });
}

const downloadJPG = (node, filename = 'diagram', height = undefined, width = undefined) => {
    htmlToImage.toJpeg(node, { quality: 0.95, backgroundColor: 'white', canvasHeight: height, canvasWidth: width },)
        .then(function (dataUrl) {
            var link = document.createElement('a');
            link.download = filename + '.jpeg';
            link.href = dataUrl;
            link.click();
        });
}

const downloadPDF = (node, filename = 'diagram', height = undefined, width = undefined) => {
    htmlToImage.toPng(node, {canvasHeight: height, canvasWidth: width },)
        .then(function (dataUrl) {
            const pdf = new jsPDF({orientation: "l"});
            pdf.addImage(dataUrl, 0, 0);
            pdf.save(filename + ".pdf");
        });
}

const ExportImage = ({nodeId}) => {
    const [showOptions, setShowOptions] = useState(false);
    const [format, setFormat] = useState('JPG');
    const [filename, setFilename] = useState('diagram');
    const [height, setHeight] = useState(undefined);
    const [width, setWidth] = useState(undefined);
    let node = document.getElementById(nodeId);

    return (
        <div>
            <Form inline>
                <div className="mb-1">
                    <Button variant="secondary" size="sm"
                            onClick={() => {
                                switch (format) {
                                    case "JPG":
                                        downloadJPG(node, filename, height, width);
                                        break;
                                    case "PNG":
                                        downloadPNG(node, filename, height, width);
                                        break;
                                    case "SVG":
                                        downloadSVG(node, filename, height, width);
                                        break;
                                    case "PDF":
                                        downloadPDF(node, filename, height, width);
                                        break;
                                    default:
                                        break;
                                }
                            }}>
                        Export image
                    </Button>
                </div>
                &nbsp;
                <div className="mb-1">
                    <Button size="sm" variant="light" onClick={() => {setShowOptions(!showOptions)}}>{showOptions ? <FiChevronUp/> : <FiChevronDown/>}</Button>
                </div>
            </Form>
            {showOptions ?
            <Form>
                <div className="mb-1">
                    <Form.Control as="select" size="sm" onChange={(e) => {
                        setFormat(e.target.value);
                        if (e.target.value === "SVG") {
                            setWidth('');
                            setHeight('');
                        }
                    }}>
                        <option value="JPG">JPG</option>
                        <option value="PNG">PNG</option>
                        <option value="SVG">SVG</option>
                        <option value="PDF">PDF</option>
                    </Form.Control>
                </div>
                <div className="mb-1">
                    <Form.Control placeholder="Height" onChange={e => {
                        if (!isNaN(e.target.value)) {
                            setHeight(e.target.value)
                        }
                    }} disabled={format==="SVG"} value={height}/>
                </div>
                <div className="mb-1">
                    <Form.Control placeholder="Width" onChange={e => {
                        if (!isNaN(e.target.value)) {
                            setWidth(e.target.value)
                        }
                    }} disabled={format==="SVG"} value={width}/>
                </div>
                <div className="mb-1">
                    <Form.Control placeholder="Image Name (w/o ext.)" onChange={e => setFilename(e.target.value)}/>
                </div>
            </Form>
                : null}
        </div>
    );
}

export default ExportImage;