### This script  will only do the pairwise DE for cell types provided as argument
### because pairwise DE is the slowest step, this makes it simpler to parallelize it
### https://github.com/WormBase/wormcells-viz
### please check that the default arguments match your annotations

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

### END OF USER ARGUMENTS SECTION --- YOU SHOULDN'T NEED TO CHANGE ANYTHING BELOW HERE ####
import sys
print('Number of arguments:', len(sys.argv), 'arguments.')
print('Argument List:', str(sys.argv))
print('Starting imports...')
### IMPORTS ###
import anndata
import scvi
import numpy as np
from tqdm import tqdm
import pandas as pd
import os
import scanpy
import warnings


warnings.filterwarnings("ignore")
print('Using scvi-tools version:', scvi.__version__)


def load_or_train_scvi_model(model_name, anndata_path):
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

def compute_pairwise_de_one_group(group1_label,
                                  model,
                                  stratification_label,
                                  model_name
                                  ):
    adata = model.adata
    print('Doing pairwise DE for ', stratification_label, group1_label)
    csv_filename = model_name + '+pairwise_de_one_group+' + group1_label + '+.csv'
    if os.path.isfile(csv_filename):
        print('Skipping pairwise DE, csv file already exists: ', csv_filename)
        return None
    else:
        
        # for a given group1_label (eg `Intestine`) do pairwise DE vs all other labels in that category (eg all other cell types)
        obs_stratification_label_unique_values = adata.obs[stratification_label].unique()
        print('Starting pairwise DE for ', len(obs_stratification_label_unique_values), ' labels:')
        print(list(obs_stratification_label_unique_values))
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
        # write to disk
        if not os.path.exists('pairwise_de'):
            os.makedirs('pairwise_de')
        pairwise_de_one_group.to_csv('./pairwise_de/'+csv_filename)
        return pairwise_de_one_group



if __name__ == '__main__':
    
    group1_label=sys.argv[1]
    stratification_label=sys.argv[2]
    model_name=sys.argv[3]
    
    print('Doing pairwise DE for label:', group1_label)
    print('Using stratification label:', stratification_label)
    print('Using model:', model_name)
    
    model = load_or_train_scvi_model(model_name=model_name, anndata_path=anndata_path)
    
    compute_pairwise_de_one_group(stratification_label=stratification_label,
                                  model=model,
                                  model_name=model_name,
                                  group1_label=group1_label)
