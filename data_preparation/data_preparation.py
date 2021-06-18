### This script  will create a trained scVI model and write the data that is used by wormcells-viz
### https://github.com/WormBase/wormcells-viz
### please check that the default arguments match your annotations
'''
It assumes that data has been wrangled into the WormBase standard anndata format:
https://github.com/WormBase/anndata-wrangling

Three separate anndata files (.h5ad) will be created:
## For the expression heatmap
This data is a 2D matrix of shape:
$ n_{celltypes} \times n_{genes} = x_{obs} \times y_{var}  $

```
adata.obs = cell_types
adata.var = gene_id
adata.X = log10 scvi expression frequency values in the X field
```
## For the gene histogram
This data is a 3D tensor of shape:
$ n_{celltypes} \times n_{bins} \times n_{genes} = x_{obs} \times y_{var} \times z_{layers} $
The anndata obs contains the cell types and var contains the histogram bins,
the genes are stored in layers with the keys being the gene ID.
We store the genes in the layers because each view in the wormcells-viz app show the histograms for a single gene,
so this makes accessing the data simpler
The histogram bin counts are computed from the scvi normalized expression values, binned in 100 bins from 10^-9 to 10^0
```
adata.obs = cell_types
adata.var = bins with counts
these should be 100 evenly spaced bins, with the counts of cells containing
values between (-10, 0), representing the data 10^-9 to 10^0 expression rates  log10 transformed
adata.X = NOTHING (filled with vector of zeroes)
adata.layers[cell_type] = the key is the corresponding cell_type
each layer contains counts in each bin for all cell types
adata.uns['about'] = information about the dataset
```

## For the swarm plots
This data is a 3D tensor of shape:
$ n_{celltypes} \times n_{genes} \times n_{celltypes} = x_{obs} \times y_{var} \times z_{layers} $
Notice that the cell types are repeated along two dimensions, because this data contains the results of pairwise DE
comparisons among each cell type in the data.
Plus $n_{celltypes}$ matrices of shape:
$ n_{celltypes} \times n_{genes} = x_{obs} \times y_{var}  $

Because each `anndata.uns[celltype]` contains a dataframe with global differnetial expression results for that celltype.
Finally, `anndata.uns['heatmap']` contains the 2D matrix with log10 scvi expression rates heatmap data, with genes in
the index and cell types in the columns. This can be used to display the expression of each tissue upon mouseover.
```
anndata.obs = cell_types
anndata.var = gene_id
anndata.X = NOTHING (filled with vector of zeroes)
anndata.layers[cell_type] = mean log fold change for a given cell type for all genes
anndata.uns[cell_type] = contain the DE result of the corresponding cell type vs all other cells
this can be used for ordering the genes by p-value, expression,
and by log fold change lfc max/min/median/mean/std
anndata.uns['heatmap']= dataframe with genes in index and cell types in columns containing the log10 of the
scvi expression frequency for each cell type
anndata.uns['about'] = information about the dataset
```
'''
### USER DEFINED ARGUMENTS
### PLEASE MAKE SURE THESE ARGUMENTS MATCH YOUR DATA

# path to anndata file on which to train the model
anndata_path = 'cengen.h5ad'
# this should be the label on which you'd like to stratify groups
# typically it is cell_type or cell_subtype
stratification_label = 'cell_subtype'

# minimum number of UMIs seen for each gene to kept
min_gene_counts = 100

### the adata.obs key on which scvi should perform batch correction
batch_key = 'sample_batch'

# model_name is the name of the folder where scvi will look for the trained model, or
# save the trained model if it doesn't find anything
model_name = 'cengen_scvi_2021-06-13'

### these multiline strings will be added to the adata.uns['about'] property, it can be anything

about_heatmap = """
Heatmap data for model {string_model_name}. 
This h5ad file is made to be used with the WormBase wormcells-viz app
https://github.com/WormBase/wormcells-viz
""".format(string_model_name=model_name)

about_histograms = """
Histogram data for model {string_model_name}. 
This h5ad file is made to be used with the WormBase wormcells-viz app 
https://github.com/WormBase/wormcells-viz
""".format(string_model_name=model_name)

about_swarmplots = """
Swarm plot data for model {string_model_name} 
this h5ad file is made to be used with the WormBase wormcells-viz app
https://github.com/WormBase/wormcells-viz
""".format(string_model_name=model_name)

### END OF USER ARGUMENTS SECTION --- YOU SHOULDN'T NEED TO CHANGE ANYTHING BELOW HERE ####


### IMPORTS ###
print('Starting imports...')
import anndata
import scvi
import numpy as np
from tqdm import tqdm
import pandas as pd
import os
import scanpy
import warnings
from scipy import sparse

warnings.filterwarnings("ignore")
print('Using scvi-tools version:', scvi.__version__)


def load_or_train_scvi_model(model_name=model_name, anndata_path=anndata_path):
    # Try loading model, if it doesn't exist train from scratch
    print('Trying to load or train model...')
    try:
        model = scvi.model.SCVI.load(model_name)
        print('Loaded model:', model_name)
    except:
        ### DEFINE AND TRAIN MODEL
        # these hyperparameters are fine for a small dataset, with a few batches
        # if integration is a problem then you can try increasing the layers to 3
        # and hidden units to 256

        print('Creating and training model:', model_name)

        adata = anndata.read_h5ad(anndata_path)
        print(adata)
        print('Restricting to genes with minimum counts of ', min_gene_counts)
        adata.var['gene_counts'] = np.squeeze(np.asarray(adata.X.sum(0)))
        adata = adata[:, adata.var.gene_counts > min_gene_counts]
        print(adata)

        ## register adata with SCVI, for more information see
        ## https://docs.scvi-tools.org/en/stable/api/reference/scvi.data.setup_anndata.html
        adata.layers["counts"] = adata.X.copy().tocsr()  # converts to CSR format, preserve counts
        scvi.data.setup_anndata(adata,
                                layer="counts",
                                batch_key=batch_key)

        # typically you don't need to go tweak these parameters for training a model
        model = scvi.model.SCVI(adata,
                                n_hidden=256,
                                n_layers=2,
                                gene_likelihood='nb',
                                dispersion='gene-batch'
                                )

        # MODEL TRAINING
        # this model will train quickly even without a GPU, 25 epochs is not quite enough to
        # finish training, but this notebook is meant to run quickly just for showing the entire
        # data generation pipeline

        model.train(check_val_every_n_epoch=1,
                    use_gpu=True,
                    max_epochs=125,
                    plan_kwargs={'lr': 1e-3})

        train_test_results = model.history['elbo_train']
        train_test_results['elbo_validation'] = model.history['elbo_validation']

        ### MAKE SURE THE MODEL FINISHED TRAINING FOR BEST RESULTS
        print(train_test_results)
        model.save(model_name, save_anndata=True)
        # save the training results to a csv for inspection if needed
        train_test_results.to_csv(model_name + '+train_test_results.csv')
    return model


def make_de_global(model, stratification_label=stratification_label, model_name=model_name):
    # perform DE on each cell type vs the rest of cells, this computes the expresssion (scale1)
    # in each celltype, used for the heatmap anndata, plus scale1, the p-values and lfc_median
    # for each cell type which are used for ranking the swarmplot
    # saves in a csv to avoid recomputing
    # checks if the CSV exists prior to running the DE
    de_global_filename = model_name + '+de_global.csv'
    try:
        de_global = pd.read_csv(de_global_filename, index_col=0)
        print('Loaded global DE:', de_global_filename)
    except:
        print('Performing global DE...')
        de_global = model.differential_expression(
            groupby=stratification_label,
            all_stats=False
        )

        # scvi currently puts the groups in a column named "comparison", eg
        # an entry would be "Neurons vs Instestine" but we need to split that into
        # one column for group1 and group2. Submitted a PR to change that:
        # https://github.com/YosefLab/scvi-tools/pull/1074
        de_global['group1'] = de_global['comparison'].str.split(' vs ', expand=True)[0]
        de_global['group2'] = de_global['comparison'].str.split(' vs ', expand=True)[1]
        de_global.to_csv(de_global_filename)

    return de_global


def make_heatmap_anndata(de_global,
                         about=about_heatmap,
                         model_name=model_name,
                         stratification_label=stratification_label):
    heatmap_anndata_filename = model_name + '+heatmap_anndata.h5ad'
    if os.path.isfile(heatmap_anndata_filename):
        print('Skipping heatmatp creation, anndata already exists at file:  ', heatmap_anndata_filename)
        return None
    else:
        print('Creating heatmap anndata... ')
        # pivot the DE result dataframe to create a dataframe for the heatmap
        # with gene ids in the index and cell type name in the columns and
        # scale1 in the entries, then take the log10 of scale1
        heatmap_df = de_global[['scale1', 'group1']]
        heatmap_df['log10scale1'] = np.log10(heatmap_df['scale1']).values
        heatmap_df = heatmap_df[['log10scale1', 'group1']]
        heatmap_df = heatmap_df.pivot(columns='group1', values='log10scale1')
        heatmap_df.to_csv(model_name + '+heatmap_df.csv')

        # put the heatmap data in anndata object
        heatmap_adata = anndata.AnnData(X=heatmap_df.values.T,
                                        obs=pd.DataFrame(index=heatmap_df.columns.values),
                                        var=pd.DataFrame(index=heatmap_df.index.values),
                                        )
        # rename obs and var to make clear what they hold
        heatmap_adata.var.index.rename('gene_id', inplace=True)
        heatmap_adata.obs.index.rename(stratification_label, inplace=True)

        # add some meatadata explaining what the data is
        heatmap_adata.uns['about'] = about_heatmap
        heatmap_adata.write_h5ad(heatmap_anndata_filename)
        print('Heatmap anndata saved: ', heatmap_anndata_filename)
        return None


def make_histogram_anndata(model,
                           stratification_label=stratification_label,
                           about_histograms=about_histograms):
    histogram_anndata_filename = model_name + '+histogram_anndata.h5ad'
    if os.path.isfile(histogram_anndata_filename):
        print('Skipping histogram creation, anndata already exists at file: ', histogram_anndata_filename)
        return None
    else:
        adata = model.adata
        bins_intervals = np.histogram([0], bins=100, range=(-10, 0), density=False)[1][:-1]
        ### get the scvi normalized expression then log10 that
        adata.layers['normalized'] = model.get_normalized_expression()
        adata.layers['log10normalized'] = np.log10(adata.layers['normalized'])

        ###loops through each cell type and then each gene to compute the histogram of expression

        # first get dimensions to initialize adata object
        obs_stratification_label_unique_values = adata.obs[stratification_label].unique()

        # gets the bin intervals from the np histogram function
        nbins = 100
        histogram_range = (-10, 0)
        bin_intervals = np.histogram([0], bins=nbins, range=histogram_range, density=False)[1][:-1]
        # converts list of bins to string for anndata var index
        bin_intervals = np.round(list(bins_intervals), 1).astype(str)
        gene_histogram_adata = anndata.AnnData(X=np.zeros((len(obs_stratification_label_unique_values),
                                                           len(bins_intervals))),
                                               var=pd.DataFrame(index=bin_intervals),
                                               obs=pd.DataFrame(index=obs_stratification_label_unique_values),
                                               )
        # rename obs and var to make clear what they hold
        gene_histogram_adata.var.index.rename('histogram_bins', inplace=True)
        gene_histogram_adata.obs.index.rename(stratification_label, inplace=True)

        # now that adata is ready loop through every gene
        # and for each gene computes the counts in each bin for each cell type
        for gene_id in tqdm(adata.var.index):
            log10_normalized_expression_in_gene = adata[:, adata.var.index == gene_id].layers['log10normalized']
            log10_normalized_expression_in_gene = np.squeeze(np.asarray(log10_normalized_expression_in_gene))
            # gets the bin intervals from the np histogram function
            gene_histogram_df = pd.DataFrame(columns=bins_intervals)
            for label in obs_stratification_label_unique_values:
                # fetch only the expression of that gene in that cell
                log10_normalized_expression_in_celltype = log10_normalized_expression_in_gene[
                    adata.obs[stratification_label] == label]
                gene_histogram_df.loc[label] = \
                    np.histogram(log10_normalized_expression_in_celltype, bins=100, range=(-10, 0), density=False)[0]
                gene_histogram_df.loc[label] = \
                    np.histogram(log10_normalized_expression_in_celltype, bins=100, range=(-10, 0), density=False)[0]
            # convert to sparse matrix to reduce final file size
            gene_histogram_adata.layers[gene_id]=sparse.csr_matrix(gene_histogram_df.values.astype('int16'))

        # add some meatadata explaining what the data is
        gene_histogram_adata.uns['about'] = about_histograms
        gene_histogram_adata.write_h5ad(histogram_anndata_filename)


def compute_pairwise_de_one_group(group1_label,
                                  model,
                                  stratification_label=stratification_label,
                                  model_name=model_name
                                  ):
    adata = model.adata
    csv_filename = model_name + '+pairwise_de_one_group+' + group1_label + '+.csv'
    
    
    if os.path.isfile('./pairwise_de/'+csv_filename):
        print('Skipping pairwise DE, csv file already exists: ', csv_filename)
        return None
    else:
        print('Doing pairwise DE for ', stratification_label, group1_label)
        # for a given group1_label (eg `Intestine`) do pairwise DE vs all other labels in that category (eg all other cell types)
        obs_stratification_label_unique_values = adata.obs[stratification_label].unique()
        pairwise_de_one_group = pd.DataFrame()
        for group2_label in tqdm(obs_stratification_label_unique_values):
            de_df = model.differential_expression(
                groupby=stratification_label,
                group1=group1_label,
                group2=group2_label,
                silent=True,
                n_samples=5000,
                all_stats=False
            )
            de_df['group1'] = group1_label
            de_df['group2'] = group2_label
            pairwise_de_one_group = pairwise_de_one_group.append(de_df)
        # write to disk just in case
        if not os.path.exists('pairwise_de'):
            os.makedirs('pairwise_de')
        pairwise_de_one_group.to_csv('./pairwise_de/'+csv_filename)
        
        return pairwise_de_one_group


def make_swarmplot_anndata(model,
                           stratification_label=stratification_label,
                           about_swarmplots=about_swarmplots):
    adata = model.adata
    obs_stratification_label_unique_values = adata.obs[stratification_label].unique()

    # check that all files exist
    for group1_label in obs_stratification_label_unique_values:
        csv_filename = model_name + '+pairwise_de_one_group+' + group1_label + '+.csv'
        if not os.path.isfile('./pairwise_de/'+csv_filename):
            print('Aborting -- Missing pairwise DE csv file: ', csv_filename)
            return None
    # initialize one pairwise_de dataframe
    pairwise_de = pd.read_csv('./pairwise_de/'+csv_filename, index_col=0)
    # make one swarm df to get the shape and order of the cell types/genes to initialize adata
    mock_swarmdf = pairwise_de.pivot(values='lfc_median', columns='group2').round(2)

    # initialize adata and fills the X with zeroes, the lfc_median for each cell type go in the layers

    swarmplot_anndata_filename = model_name + '+swarmplot_anndata.h5ad'
    swarmplot_adata = anndata.AnnData(X=np.zeros((len(mock_swarmdf.columns), len(mock_swarmdf.index))),
                                      obs=pd.DataFrame(index=mock_swarmdf.columns),
                                      var=pd.DataFrame(index=mock_swarmdf.index),
                                      )
    # loop through the celltypes and stores the lfc values for each cell in a layer
    for group1_label in tqdm(mock_swarmdf.columns):
        csv_filename = model_name + '+pairwise_de_one_group+' + group1_label + '+.csv'
        pairwise_de = pd.read_csv('./pairwise_de/'+csv_filename, index_col=0)
        swarmdf = pairwise_de[pairwise_de['group1'] == group1_label].pivot(values='lfc_median', columns='group2').round(
            2)
        swarmplot_adata.layers[group1_label] = swarmdf.values.T
        ## convert data type float16 to reduce final anndata file size
        swarmplot_adata.layers[group1_label] = swarmplot_adata.layers[group1_label].astype('float16')

        # now performs one vs all DE and stores those results in adata.uns for access so that the genes can be sorted according to them
        global_de = model.differential_expression(
            groupby=stratification_label,
            group1=group1_label,
            all_stats=False,
            n_samples=5000,
            silent=True
        )
        # only keep needed columns as type float16 to reduce final anndata file size
        global_de = global_de[['proba_not_de', 'scale1', 'scale2', 'lfc_mean', 'lfc_median']].astype('float16')
        swarmplot_adata.uns[group1_label] = global_de
        # also store the heatmap on the uns field for showing the mean expressison on tissue
        # during mouseover
        heatmap_df = pd.read_csv(model_name + '+heatmap_df.csv', index_col=0)
        print(heatmap_df)
        swarmplot_adata.uns['heatmap'] = heatmap_df
    # rename obs and var to make clear what they hold
    swarmplot_adata.var.index.rename('gene_id', inplace=True)
    swarmplot_adata.obs.index.rename(stratification_label, inplace=True)

    swarmplot_adata.uns['about'] = about_swarmplots

    swarmplot_adata.write_h5ad(swarmplot_anndata_filename)


if __name__ == '__main__':
    print('Starting the pipeline...')
    model = load_or_train_scvi_model(model_name=model_name, anndata_path=anndata_path)

    de_global = make_de_global(stratification_label=stratification_label, model=model, model_name=model_name)
    print('✔️ Done with global DE')
    make_heatmap_anndata(de_global=de_global, about=about_heatmap,
                         model_name=model_name,
                         stratification_label=stratification_label)
    print('✔️✔️ Done with heatmap')
    make_histogram_anndata(stratification_label=stratification_label,
                           model=model,
                           about_histograms=about_histograms)
    print('✔️✔️✔️ Done with histogram')
    for group1_label in model.adata.obs[stratification_label].unique():
        compute_pairwise_de_one_group(stratification_label=stratification_label,
                                      model=model,
                                      model_name=model_name,
                                      group1_label=group1_label)
    print('✔️✔️✔️✔️ Done with pairwise DE')
    make_swarmplot_anndata(stratification_label=stratification_label,
                           model=model,
                           about_swarmplots=about_swarmplots)
    print('✔️✔️✔️✔️✔️ Done with swarmplot')
