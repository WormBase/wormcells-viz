const Home = () => {

    return (
        <div>
            <p className="text-center">
                <br/>
                <h4>WormBase visualization tools for <i>C. elegans</i> single-cell data.</h4>
                <p>This app is based on the <a
                    href="https://d3js.org/" target="_blank">D3.js</a> data visualization library.<br/>
                    Source code is available at <a href="https://github.com/WormBase/wormcells-viz/"
                       target="_blank">github.com/WormBase/wormcells-viz</a>.
                    <br/> Please note that WormBase reprocesses the original data starting from the author provided gene
                    count matrices.
                    <br/> The data was processed using the
                    <a href="https://docs.scvi-tools.org/en/stable/api/reference/scvi.model.SCVI.html"
                       target="_blank">scVI</a>
                    model from
                    <a href="https://scvi-tools.org/" target="_blank">scvi-tools</a>, a probabilistic framework
                    for single cell RNA sequencing data that explicitly models technical aspects of the data
                    such as batch and sequencing depth. scVI is a generative model that among other things can estimate
                    the gene expression rate of each gene in each cell - what fraction of the transcripts sampled would
                    belong to a gene in that cell.

                    <br/> For details on how the data was processed, please visit the <a href="https://github.com/WormBase/wormcells-viz/" target="_blank">wormcells-viz</a> GitHub repository.
                    <br/>

                </p>

                <h5>Heatmaps & dot plots</h5>
                <p> Select cell types and genes to visualize mean gene expression rates. <br/>
                    The dotplots display the same information as the heatmap.
                </p>
                <br/>

                <h5>Gene expression histograms</h5>
                <p>Visualize gene abundances stratified by cell type. Because scVI can estimate the expresssion rate
                    for each gene in each cell while accounting for batch and sequencing depth, we can plot histograms
                    of these gene expression rates for each cell type to glean a bit more information than
                    just with a single number (the mean).

                </p><br/>


                <h5>Swarm plots</h5>
                <p>Visualize expression of a gene across all cell types relative to one cell type.
                    Swarm plots are useful for identifying candidate marker genes for a given tissue.
                    On the Y axis they display a set of selected genes, which can be sorted by p-value from
                    differential expression analysis. On the X axis the log fold change of all other cell types is
                    displayed, relative to the chosen tissue.
                    By showing the log fold change of each gene in every tissue, it provides a more complete picture
                    than just a volcano plot for choosing marker candidates.
                </p>
            </p>
        </div>
    );
}

export default Home;