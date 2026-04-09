import type {ExpenseCategoryDTO, CreateExpenseCategoryDTO, UpdateExpenseCategoryDTO} from "../types"


const API_URL = "https://localhost:7094/api/expenseCategory";

export async function getExpenseCategoriesByAccountID(accountID: string) : Promise<ExpenseCategoryDTO[]>{
    const response = await fetch(`${API_URL}/account/${accountID}`);

    if(!response.ok){
        throw new Error("Failed to fetch expense categories");
    }
    return response.json();
}

export async function getExpenseCategoryByID(categoryID: string) : Promise<ExpenseCategoryDTO[]>{
    const response = await fetch(`${API_URL}/${categoryID}`);

    if(!response.ok){
        throw new Error("Failed to fetch expense categories");
    }
    return response.json();
}

export async function createCategory(category: CreateExpenseCategoryDTO) : Promise<ExpenseCategoryDTO>{
    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(category),
    });

    if(!response.ok){
        throw new Error("Failed to create category");
    }

    return response.json();
}

export async function updateCategory(categoryID: string, category: UpdateExpenseCategoryDTO) : Promise<ExpenseCategoryDTO>{
    const response = await fetch(`${API_URL}/${categoryID}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(category),
    });

    if (!response)
    {
        throw new Error("Failed to update category");
    }
    return response.json();
}

export async function deleteExpenseCategory(categoryID: string) : Promise<void>{
    const response = await fetch(`${API_URL}/${categoryID}`,{
        method: "DELETE",
    });

    if(!response.ok){
        throw new Error("Failed to delete category");
    }
}