
### this file can be run with snakemake to easily parallelize the DE step when are many 
### cell types to just run serially, it uses the script `pairwise_de_only.py` to make one job per cell type 
### for example with the CeNGEN data there were 169 cell types, and each pass took an hour
### so this snakemake was used to run 169 jobs in parallel in the Caltech cluster


### to run the snakemake with 30 jobs in parallel you can use this line
# snakemake -j 30 -s ./pairwise_de_snakemake.py --keep-going --rerun-incomplete --latency-wait 50 --verbose

### to run the snakemake with 320 jobs in parallel, 10 processors per job, and add the sample name to each job
### you can use this line instead
# snakemake -j 320 -s ./pairwise_de_snakemake.py --keep-going --rerun-incomplete --latency-wait 50 --cluster "sbatch -A SternbergGroup --ntasks 10 --nodes 1 --job-name '{wildcards.sample}' -t 3400 --mem-per-cpu=10200  --output=./logs/pairwise_de_snakemake_cengen%j.log" --verbose


### modify this sample list to be the cell types or groups that you are interested in
SAMPLE_LIST=['ADA', 'ADE', 'ADF', 'ADL', 'AFD', 'AIA', 'AIB', 'AIM', 'AIN', 
             'AIY', 'AIZ', 'ALA', 'ALM', 'ALN', 'AMsh', 'AMso', 'AQR', 'AS', 
             'ASEL', 'ASER', 'ASG', 'ASH', 'ASI', 'ASJ', 'ASK', 'AUA', 'AVA', 
             'AVB', 'AVD', 'AVE', 'AVF', 'AVG', 'AVH', 'AVJ', 'AVK', 'AVL', 
             'AVM', 'AWA', 'AWB', 'AWC_OFF', 'AWC_ON', 'Anal_muscle', 'Arcade_cell', 
             'BAG', 'BDU', 'Body_wall_muscle', 'Body_wall_muscle_anterior', 'CAN', 
             'CEP', 'CEPsh', 'Coelomocyte', 'DA', 'DA9', 'DB', 'DB01', 'DVA', 'DVB', 
             'DVC', 'Distal_tip_cell', 'Epidermis', 'Excretory_cell', 'Excretory_gland_cell', 
             'FLP', 'Germline', 'Glia_1', 'Glia_2', 'Glia_3', 'Glia_4', 'Glia_5', 
             'Gonadal_sheath_cell', 'HSN', 'I1', 'I2', 'I3', 'I4', 'I5', 'I6', 'IL1', 
             'IL2_DV', 'IL2_LR', 'Intestine', 'LUA', 'M1', 'M2', 'M3', 'M4', 'M5', 'MC', 
             'MI', 'Marginal_cell', 'NSM', 'OLL', 'OLQ', 'PDA', 'PDB', 'PDE', 'PHA', 'PHB', 
             'PHC', 'PHsh', 'PHso', 'PLM', 'PLN', 'PQR', 'PVC', 'PVD', 'PVM', 'PVN', 'PVP', 
             'PVQ', 'PVR', 'PVT', 'PVW', 'Pharyngeal_gland_cell', 'Pharyngeal_muscle', 'RIA', 
             'RIB', 'RIC', 'RID', 'RIF', 'RIG', 'RIH', 'RIM', 'RIP', 'RIR', 'RIS', 'RIV', 
             'RIV_stressed', 'RMD_DV', 'RMD_LR', 'RME_DV', 'RME_LR', 'RMF', 'RMG', 'RMH', 
             'Rectal_gland', 'SAA', 'SAB', 'SDQ', 'SIA', 'SIB', 'SMB', 'SMD', 'SMD_stressed', 
             'Seam_cell', 'Sperm', 'Spermatheca', 'Spermathecal-uterine_junction_or_uterine_toroid', 
             'URA', 'URB', 'URX', 'URY', 'Unannotated', 'Unknown_non-neuronal_3', 'Unknown_non_neuronal',
             'Unknown_non_neuronal_2', 'Uterine_cell', 'VA', 'VA12', 'VB', 'VB01', 'VB02', 'VC', 
             'VC_4_5', 'VD_DD', 'Vulval_cells', 'Vulval_muscle', 'XXX', 'hmc']


MODEL_NAME='cengen_scvi'
STRATIFICATION_GROUP='cell_subtype'
rule all:
    input:
        expand('{MODEL_NAME}+pairwise_de_one_group+{sample}+.csv', sample=SAMPLE_LIST)        
        
rule run_pairwisede:   
    params: 
        SAMPLE_NAME = '{sample}',
    output:
         OUT_FILE='{MODEL_NAME}+pairwise_de_one_group+{sample}+.csv',
    threads: 1
         
    shell:
        """    
        python3 pairwise_de_only.py {params.SAMPLE_NAME} {STRATIFICATION_GROUP} {MODEL_NAME}
        """ 
